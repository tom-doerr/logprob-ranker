# Development Notes

## LSP Issues

There are some LSP (Language Server Protocol) issues reported in the codebase that can be safely ignored. These are due to the circular import structure that is necessary for the package to work correctly while maintaining proper type hints.

### Example files

The LSP errors in example files like:
```
Error on line 29: "LogProbConfig" is unknown import symbol
Error on line 30: "LiteLLMAdapter" is unknown import symbol
Error on line 31: "RankedOutput" is unknown import symbol
```

These are safe to ignore because:
1. The example files add the parent directory to sys.path at runtime
2. The imports work correctly when the examples are run as scripts
3. The package is not installed in development mode in the IDE environment

### Utils module issues

The errors in `utils.py` like:
```
Expression of type "type[logprob_ranker.logprob_ranker.ranker.AttributeScore]" cannot be assigned to declared type "type[logprob_ranker.logprob_ranker.utils.AttributeScore]"
```

These are due to:
1. Type stubs defined in `utils.py` for IDE assistance
2. The actual classes imported from `ranker.py` at runtime
3. Circular imports between `utils.py` and `ranker.py`

This approach allows better code completion in IDEs while maintaining proper functionality at runtime.

## Project Structure

The project uses a simple structure:

```
logprob_ranker/
├── logprob_ranker/           # Main package
│   ├── __init__.py           # Package exports
│   ├── ranker.py             # Core implementation
│   ├── utils.py              # Utility functions
│   ├── cli.py                # Command-line interface
│   └── __main__.py           # Direct script execution
├── examples/                 # Example scripts
├── tests/                    # Test cases
├── docs/                     # Documentation
├── setup.py                  # Package setup
├── pyproject.toml            # Project metadata
├── README.md                 # Overview documentation
├── CHANGELOG.md              # Version history
├── LICENSE                   # License information
└── PUBLISHING.md             # Publishing instructions
```

## Compatibility Considerations

- The package requires Python 3.8+ due to type annotation syntax
- The async features rely on `asyncio` which has improved significantly since Python 3.8
- LiteLLM dependency is used for multi-provider support