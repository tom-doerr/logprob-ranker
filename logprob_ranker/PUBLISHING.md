# Publishing Guide for LogProb Ranker

This document outlines the steps to prepare and publish the LogProb Ranker package to PyPI.

## Prerequisites

Before publishing, ensure you have the following tools installed:

```bash
pip install build twine
```

## Version Update Checklist

Before each release, update the following files:

1. `logprob_ranker/__init__.py`: Update the `__version__` variable
2. `setup.py`: Update the `version` parameter to match
3. `CHANGELOG.md`: Add a new section with version, date, and changes

## Building the Package

From the repository root:

```bash
# Clean previous builds
rm -rf build/ dist/ *.egg-info/

# Build the package
python -m build
```

This will create both source and wheel distributions in the `dist/` directory.

## Testing the Package

Before publishing to PyPI, test the package locally:

```bash
# Create a virtual environment
python -m venv test_env
source test_env/bin/activate  # On Windows: test_env\Scripts\activate

# Install the local package
pip install dist/logprob_ranker-X.Y.Z-py3-none-any.whl

# Test the package
python -c "from logprob_ranker import LogProbConfig, LiteLLMAdapter; print('Package works!')"

# Clean up
deactivate
rm -rf test_env/
```

## Uploading to TestPyPI (Optional)

To test the publishing process without affecting the real PyPI:

```bash
# Upload to TestPyPI
python -m twine upload --repository testpypi dist/*

# Install from TestPyPI
pip install --index-url https://test.pypi.org/simple/ logprob-ranker
```

## Publishing to PyPI

Once you've verified everything works:

```bash
# Upload to PyPI
python -m twine upload dist/*
```

You'll need to enter your PyPI username and password.

## After Publishing

1. Create a GitHub release with the same version number
2. Tag the release in your git repository:
   ```bash
   git tag v0.X.Y
   git push origin v0.X.Y
   ```

## Troubleshooting

If you encounter "File already exists" errors when uploading to PyPI:
- You cannot upload a file with the same name twice to PyPI (even if deleted)
- Increment the version number and rebuild the package