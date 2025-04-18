# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-04-18

### Added
- LiteLLM integration for multiple provider support
- Support for various LLM providers (OpenAI, Anthropic, Cohere, Azure, etc.)
- Enhanced CLI with provider-specific options
- Improved example scripts demonstrating multi-provider usage
- Provider comparison functionality

### Changed
- Replaced direct OpenAI/Anthropic API calls with LiteLLM unified interface
- Updated documentation with provider-specific information
- Enhanced serialization to support provider metadata

### Fixed
- Compatibility issues between modules
- Type hinting across package


## [0.1.0] - 2025-04-15

### Added
- Initial release
- Core LogProb ranking functionality
- Basic CLI
- OpenAI integration
- Example scripts