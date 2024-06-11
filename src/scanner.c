#include <tree_sitter/parser.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <wctype.h>

typedef enum
{
  LINE_START,
  LINE_CONTENT,
  DASHES,
  AFTER_DASHES,
} MatchState;

typedef enum
{
  NEWLINE,
  INDENT,
  DEDENT,
  STRING_START,
  STRING_CONTENT,
  STRING_END,
  COMMENT,
} TokenType;

typedef struct
{
  char flags;
} Delimiter;

#define SINGLE_QUOTE (1 << 0)
#define DOUBLE_QUOTE (1 << 1)

typedef struct
{
  uint16_t previous_indent_length;
  Delimiter *delimiter_stack;
  size_t delimiter_stack_size;
  size_t delimiter_stack_capacity;
} Scanner;

static void Delimiter_init(Delimiter *delimiter)
{
  delimiter->flags = 0;
}

static int32_t Delimiter_end_character(const Delimiter *delimiter)
{
  if (delimiter->flags & SINGLE_QUOTE)
    return '\'';
  if (delimiter->flags & DOUBLE_QUOTE)
    return '"';
  return 0;
}

static void Delimiter_set_end_character(Delimiter *delimiter, int32_t character)
{
  switch (character)
  {
  case '\'':
    delimiter->flags |= SINGLE_QUOTE;
    break;
  case '"':
    delimiter->flags |= DOUBLE_QUOTE;
    break;
  default:
    assert(false);
  }
}

static Scanner *Scanner_new()
{
  Scanner *scanner = (Scanner *)malloc(sizeof(Scanner));
  assert(scanner != NULL);
  scanner->previous_indent_length = 0;
  scanner->delimiter_stack = NULL;
  scanner->delimiter_stack_size = 0;
  scanner->delimiter_stack_capacity = 0;
  return scanner;
}

static void Scanner_free(Scanner *scanner)
{
  if (scanner->delimiter_stack != NULL)
  {
    free(scanner->delimiter_stack);
  }
  free(scanner);
}

static unsigned Scanner_serialize(Scanner *scanner, char *buffer)
{
  size_t i = 0;

  // Serialize the delimiter_stack
  size_t delimiter_count = scanner->delimiter_stack_size;
  if (delimiter_count > UINT8_MAX)
    delimiter_count = UINT8_MAX;
  buffer[i++] = delimiter_count;

  if (delimiter_count > 0)
  {
    memcpy(&buffer[i], scanner->delimiter_stack, delimiter_count * sizeof(Delimiter));
  }
  i += delimiter_count * sizeof(Delimiter);

  // Serialize the previous_indent_length
  buffer[i++] = scanner->previous_indent_length;

  return i;
}

static void Scanner_deserialize(Scanner *scanner, const char *buffer, unsigned length)
{
  scanner->previous_indent_length = 0;

  if (scanner->delimiter_stack != NULL)
  {
    free(scanner->delimiter_stack);
    scanner->delimiter_stack = NULL;
  }
  scanner->delimiter_stack_size = 0;

  if (length > 0)
  {
    size_t i = 0;

    // Deserialize (delimiter_count, *delimiter_stack)
    size_t delimiter_count = (uint8_t)buffer[i++];
    scanner->delimiter_stack = (Delimiter *)malloc(delimiter_count * sizeof(Delimiter));
    assert(scanner->delimiter_stack != NULL);
    scanner->delimiter_stack_size = delimiter_count;
    scanner->delimiter_stack_capacity = delimiter_count;
    if (delimiter_count > 0)
    {
      memcpy(scanner->delimiter_stack, &buffer[i], delimiter_count * sizeof(Delimiter));
    }
    i += delimiter_count * sizeof(Delimiter);

    // Deserialize previous_indent_length
    scanner->previous_indent_length = buffer[i++];
  }
}

static inline bool is_whitespace(int32_t lookahead)
{
  return lookahead == ' ' || lookahead == '\t' || lookahead == '\r' || lookahead == '\f';
}

static void skip(TSLexer *lexer)
{
  lexer->advance(lexer, true);
}

static inline int skip_whitespace(TSLexer *lexer)
{
  int indent_length = 0;
  for (;;)
  {
    if (lexer->lookahead == ' ')
    { // space
      indent_length++;
      skip(lexer);
    }
    else if (lexer->lookahead == '\t')
    { // tab - treat as 8 spaces
      indent_length += 8;
      skip(lexer);
    }
    else if (lexer->lookahead == '\r')
    { // carriage return - reset indent
      indent_length = 0;
      skip(lexer);
    }
    else if (lexer->lookahead == '\f')
    { // form feed - reset indent
      indent_length = 0;
      skip(lexer);
    }
    else
    {
      return indent_length;
    }
  }
}

static void advance_line(TSLexer *lexer, bool skip)
{
  while (lexer->lookahead && lexer->lookahead != '\n')
  {
    lexer->advance(lexer, skip);
  }
  lexer->advance(lexer, true);
}

static void advance(TSLexer *lexer)
{
  lexer->advance(lexer, false);
}

static inline bool find_match_end(TSLexer *lexer, bool skip_any)
{

  // Search for "-\n" at the start of the file or line.
  MatchState match_state = LINE_START;
  while (lexer->lookahead)
  {
    // Found a dash at the start of a file or line.
    if (lexer->lookahead == '-')
    {
      if (match_state == LINE_START || match_state == DASHES)
      {
        match_state = DASHES;
        advance(lexer);
      }
      else
      { // If AFTER_DASHES, set match_state to LINE_CONTENT,
        // e.g., "-- -- --" is not a valid separator.
        match_state = LINE_CONTENT;
        skip(lexer);
      }
    }
    // Found the end of the line.
    else if (lexer->lookahead == '\n')
    {
      if (match_state == DASHES || match_state == AFTER_DASHES)
      { // ... *after* dashes
        return true;
      }
      else
      { // ... *not after* dashes.
        match_state = LINE_START;
        skip(lexer);
      }
    }
    // Found the end of the file.
    else if (lexer->lookahead == 0)
    {
      if (match_state == DASHES || match_state == AFTER_DASHES)
      { // ... *after* dashes
        return true;
      }
      else
      { // ... *not after* dashes.
        return false;
      }
    }
    // Found some whitespace after the '-'.
    else if (is_whitespace(lexer->lookahead) && (match_state == DASHES || match_state == AFTER_DASHES))
    { // If DASHES, set match_state to AFTER_DASHES, to distinguish between,
      // e.g., "--   " (valid) and "-- -- --" (not valid).
      match_state = AFTER_DASHES;
      skip(lexer);
    }
    // Found any other character.
    else if (skip_any)
    {
      match_state = LINE_CONTENT;
      skip(lexer);
    }
    else
    {
      return false;
    }
  }
  return false;
}

static bool Scanner_scan(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols)
{
  // Check for string content.
  if (valid_symbols[STRING_CONTENT] && scanner->delimiter_stack_size > 0)
  {
    Delimiter delimiter = scanner->delimiter_stack[scanner->delimiter_stack_size - 1];
    int32_t end_character = Delimiter_end_character(&delimiter);
    bool has_content = false;
    while (lexer->lookahead)
    {
      if (lexer->lookahead == '{' || lexer->lookahead == '}')
      {
        lexer->mark_end(lexer);
        lexer->result_symbol = STRING_CONTENT;
        return has_content;
      }
      else if (lexer->lookahead == '\\')
      {
        lexer->mark_end(lexer);
        lexer->result_symbol = STRING_CONTENT;
        return has_content;
      }
      else if (lexer->lookahead == end_character)
      {
        if (has_content)
        {
          lexer->result_symbol = STRING_CONTENT;
        }
        else
        {
          advance(lexer);
          scanner->delimiter_stack_size--;
          lexer->result_symbol = STRING_END;
        }
        lexer->mark_end(lexer);
        return true;
      }
      else if (lexer->lookahead == '\n' && has_content)
      {
        return false;
      }
      advance(lexer);
      has_content = true;
    }
  }

  lexer->mark_end(lexer);

  bool found_end_of_line = false;
  uint32_t indent_length = 0;
  int32_t first_comment_indent_length = -1;

  // loop until we find the next content character
  for (;;)
  {
    if (lexer->lookahead == '\n')
    { // newline
      found_end_of_line = true;
      indent_length = 0;
      skip(lexer);
    }
    else if (lexer->lookahead == ' ')
    { // space
      indent_length++;
      skip(lexer);
    }
    else if (lexer->lookahead == '\t')
    { // tab - treat as 8 spaces
      indent_length += 8;
      skip(lexer);
    }
    else if (lexer->lookahead == '\r')
    { // carriage return - reset indent
      indent_length = 0;
      skip(lexer);
    }
    else if (lexer->lookahead == '\f')
    { // form feed - reset indent
      indent_length = 0;
      skip(lexer);
    }
    else if (lexer->lookahead == 0)
    { // end of file
      indent_length = 0;
      found_end_of_line = true;
      break;
    }
    else if (lexer->lookahead == '#')
    { // comment
      if (first_comment_indent_length == -1)
      {
        first_comment_indent_length = (int32_t)indent_length;
      }
      advance_line(lexer, true);
      indent_length = 0;
    }
    else
    { // any content character
      break;
    }
  }

  if (found_end_of_line)
  {
    if (valid_symbols[INDENT] && scanner->previous_indent_length == 0 && indent_length > 0)
    {
      scanner->previous_indent_length = indent_length;
      lexer->result_symbol = INDENT;
      return true;
    }

    if (
        valid_symbols[DEDENT] &&
        scanner->previous_indent_length > 0 &&
        indent_length == 0 &&

        // Wait to create a dedent token until we've consumed any comments
        // whose indentation matches the current block.
        first_comment_indent_length < (int32_t)scanner->previous_indent_length)
    {
      scanner->previous_indent_length = indent_length;
      lexer->result_symbol = DEDENT;
      return true;
    }

    if (valid_symbols[NEWLINE])
    {
      lexer->result_symbol = NEWLINE;
      return true;
    }
  }

  if (first_comment_indent_length == -1 && valid_symbols[STRING_START])
  {
    Delimiter delimiter;
    Delimiter_init(&delimiter);

    if (lexer->lookahead == '\'')
    {
      Delimiter_set_end_character(&delimiter, '\'');
      advance(lexer);
      lexer->mark_end(lexer);
    }
    else if (lexer->lookahead == '"')
    {
      Delimiter_set_end_character(&delimiter, '"');
      advance(lexer);
      lexer->mark_end(lexer);
    }

    if (Delimiter_end_character(&delimiter))
    {
      if (scanner->delimiter_stack_size == scanner->delimiter_stack_capacity)
      {
        scanner->delimiter_stack_capacity = scanner->delimiter_stack_capacity ? scanner->delimiter_stack_capacity * 2 : 1;
        scanner->delimiter_stack = (Delimiter *)realloc(scanner->delimiter_stack, scanner->delimiter_stack_capacity * sizeof(Delimiter));
        assert(scanner->delimiter_stack != NULL);
      }
      scanner->delimiter_stack[scanner->delimiter_stack_size++] = delimiter;
      lexer->result_symbol = STRING_START;
      return true;
    }
  }

  return false;
}

void *tree_sitter_talon_external_scanner_create()
{
  return Scanner_new();
}

bool tree_sitter_talon_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols)
{
  Scanner *scanner = (Scanner *)payload;
  return Scanner_scan(scanner, lexer, valid_symbols);
}

unsigned tree_sitter_talon_external_scanner_serialize(void *payload, char *buffer)
{
  Scanner *scanner = (Scanner *)payload;
  return Scanner_serialize(scanner, buffer);
}

void tree_sitter_talon_external_scanner_deserialize(void *payload, const char *buffer, unsigned length)
{
  Scanner *scanner = (Scanner *)payload;
  Scanner_deserialize(scanner, buffer, length);
}

void tree_sitter_talon_external_scanner_destroy(void *payload)
{
  Scanner *scanner = (Scanner *)payload;
  Scanner_free(scanner);
}
