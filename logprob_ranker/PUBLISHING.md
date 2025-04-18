# Publishing to PyPI

This document describes how to publish the LogProb Ranker package to PyPI.

## Prerequisites

1. Create a PyPI account at https://pypi.org/account/register/
2. Install build and twine:
   ```bash
   pip install build twine
   ```

## Preparing for Release

1. Update the version number in:
   - `pyproject.toml`
   - `setup.py` 
   - `logprob_ranker/__init__.py`

2. Update `CHANGELOG.md` with the changes in this release.

3. Make sure all tests pass:
   ```bash
   python -m unittest discover tests
   ```

## Building the Package

Build both source distribution and wheel:

```bash
python -m build
```

This will create a `dist` directory with the package files.

## Testing the Package Locally

You can install the package locally to test it:

```bash
pip install -e .
```

## Uploading to TestPyPI (Recommended)

Before publishing to the main PyPI repository, test your package on TestPyPI:

```bash
python -m twine upload --repository-url https://test.pypi.org/legacy/ dist/*
```

Then install and test your package from TestPyPI:

```bash
pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple logprob-ranker
```

## Publishing to PyPI

Once you've verified everything works on TestPyPI, upload to the main PyPI repository:

```bash
python -m twine upload dist/*
```

## After Publishing

1. Create a new release on GitHub with the same version number.
2. Tag the release in git:
   ```bash
   git tag v0.1.0
   git push --tags
   ```

## Troubleshooting

- If you get an error about the package already existing, you need to increment the version number.
- If you need to update the package description or metadata, update the relevant files and rebuild.
- If your package has dependencies, make sure they're correctly listed in `pyproject.toml` and `setup.py`.