import os

api_key = os.getenv("OPENROUTER_API_KEY")

if api_key:
    # For security, print only a redacted version if it's long enough
    redacted_key = f"{api_key[:5]}...{api_key[-5:]}" if len(api_key) > 10 else "Key too short to redact fully"
    print(f"SUCCESS: Found OPENROUTER_API_KEY in this Python process: '{redacted_key}'")
else:
    print("FAILURE: OPENROUTER_API_KEY NOT FOUND in this Python process's environment.")

print("\nTo set it in your current terminal (bash/zsh):")
print('  export OPENROUTER_API_KEY="your_actual_key_value_here"')
print("Then run this script again from the SAME terminal:")
print("  python check_env.py")
