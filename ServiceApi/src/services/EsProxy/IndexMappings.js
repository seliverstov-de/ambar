import config from '../../config.js'

const { langAnalyzer } = config

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm:ss.SSS'

export const FileIndexMapping = {
  settings: {
    number_of_shards: 8,
    analysis: {
      char_filter: {
        ambar_cf: {
          type: 'mapping',
          mappings: [
            'ё => е',
            'Ё => Е',
            ': => \\u0020'
          ]
        }
      },
      filter: {
        russian_replace_i: {
          type: 'pattern_replace',
          pattern: 'й',
          replacement: 'и'
        },
        russian_stop: {
          type: 'stop',
          stopwords: '_russian_'
        },
        russian_stemmer: {
          type: 'stemmer',
          language: 'russian'
        },
        ambar_word_delimiter: {
          type: 'word_delimiter',
          generate_word_parts: true,
          generate_number_parts: true,
          catenate_words: true,
          catenate_numbers: true,
          catenate_all: true,
          split_on_case_change: true,
          split_on_numerics: true,
          preserve_original: true
        },
        english_stop: {
          type: 'stop',
          stopwords: '_english_'
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english'
        },
        english_possessive_stemmer: {
          type: 'stemmer',
          language: 'possessive_english'
        },
        italian_elision: {
          type: 'elision',
          articles: [
            'c',
            'l',
            'all',
            'dall',
            'dell',
            'nell',
            'sull',
            'coll',
            'pell',
            'gl',
            'agl',
            'dagl',
            'degl',
            'negl',
            'sugl',
            'un',
            'm',
            't',
            's',
            'v',
            'd'
          ]
        },
        italian_stop: {
          type: 'stop',
          stopwords: '_italian_'
        },
        italian_stemmer: {
          type: 'stemmer',
          language: 'light_italian'
        },
        german_stop: {
          type: 'stop',
          stopwords: '_german_'
        },
        german_stemmer: {
          type: 'stemmer',
          language: 'light_german'
        }
      },
      analyzer: {
        ambar_keyword: {
          tokenizer: 'keyword',
          filter: [
            'lowercase'
          ]
        },
        ambar_ru: {
          tokenizer: 'standard',
          char_filter: [
            'ambar_cf'
          ],
          filter: [
            'lowercase',
            'russian_stop',
            'russian_stemmer',
            'ambar_word_delimiter',
            'russian_replace_i'
          ]
        },
        ambar_en: {
          tokenizer: 'standard',
          filter: [
            'english_possessive_stemmer',
            'lowercase',
            'english_stop',
            'english_stemmer',
            'ambar_word_delimiter'
          ]
        },
        ambar_it: {
          tokenizer: 'standard',
          filter: [
            'italian_elision',
            'lowercase',
            'italian_stop',
            'italian_stemmer'
          ]
        },
        ambar_de: {
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'german_stop',
            'german_normalization',
            'german_stemmer'
          ]
        },
        ambar_cjk: {
          tokenizer: 'standard',
          filter: [
            'cjk_width',
            'lowercase',
            'cjk_bigram',
            'english_stop'
          ]
        },
        ambar_pl: {
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'polish_stem'
          ]
        },
        ambar_cn: {
          tokenizer: 'smartcn_tokenizer',
          filter: [
            'lowercase'
          ]
        }
      }
    }
  },
  mappings: {
    dynamic: 'strict',
    properties: {
      type: { type: 'keyword' },
      tags: {
        type: 'nested',
        dynamic: 'strict',
        properties: {
          type: { type: 'keyword' },
          name: { type: 'keyword' },
        }
      },
      content: {
        type: 'object',
        dynamic: 'strict',
        properties: {
          processed_datetime: { type: 'date', format: DATE_TIME_FORMAT },
          size: { type: 'unsigned_long' },
          state: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: langAnalyzer
          },
          language: {
            type: 'text',
            analyzer: 'ambar_keyword',
            fielddata: true,
            fields: {
              analyzed: {
                type: 'text',
                analyzer: langAnalyzer
              }
            }
          },
          type: {
            type: 'text',
            analyzer: 'ambar_keyword',
            fielddata: true,
            fields: {
              analyzed: {
                type: 'text',
                analyzer: langAnalyzer
              }
            }
          },
          author: {
            type: 'text',
            analyzer: 'ambar_keyword',
            fielddata: true,
            fields: {
              analyzed: {
                type: 'text',
                analyzer: langAnalyzer
              }
            }
          },
          length: { type: 'unsigned_long' },
          text: {
            type: 'text',
            analyzer: langAnalyzer,
            term_vector: "with_positions_offsets",
            store: true

          },
          thumb_available: { type: 'boolean' },
          ocr_performed: { type: 'boolean' },
        }
      },
      meta: {
        type: 'object',
        dynamic: 'strict',
        properties: {
          id: { type: 'keyword' },
          full_name: {
            type: 'text',
            analyzer: 'ambar_keyword',
            fielddata: true,
            fields: {
              analyzed: {
                type: 'text',
                analyzer: langAnalyzer
              }
            }
          },
          full_name_parts: {
            type: 'text',
            analyzer: 'ambar_keyword',
            fielddata: true,
            fields: {
              analyzed: {
                type: 'text',
                analyzer: langAnalyzer
              }
            }
          },
          short_name: {
            type: 'text',
            analyzer: 'ambar_keyword',
            fielddata: true,
            fields: {
              analyzed: {
                type: 'text',
                analyzer: langAnalyzer
              }
            }
          },
          extension: { type: 'keyword' },
          extra: {
            type: 'object',
            dynamic: 'strict',
            properties: {
              type: {
                type: 'keyword'
              },
              value: {
                type: 'text'
              }
            }
          },
          source_id: { type: 'keyword' },
          created_datetime: { type: 'date', format: DATE_TIME_FORMAT },
          updated_datetime: { type: 'date', format: DATE_TIME_FORMAT },
        }
      },
      sha256: { type: 'keyword' },
      hidden: { type: 'boolean' },
      file_id: { type: 'keyword' },
      indexed_datetime: { type: 'date', format: DATE_TIME_FORMAT },
    }
  }
}

export const LogIndexMapping = {
  settings: {
    number_of_shards: 10
  },
  mappings: {
    dynamic: 'strict',
    properties: {
      type: { type: 'keyword' },
      source_id: { type: 'keyword' },
      message: { type: 'match_only_text' },
      indexed_datetime: { type: 'date', format: DATE_TIME_FORMAT },
      created_datetime: { type: 'date', format: DATE_TIME_FORMAT },
    }
  }
}
