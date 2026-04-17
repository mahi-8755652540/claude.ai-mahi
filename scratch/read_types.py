
import os
import re

types_path = r'c:\Users\admin\Downloads\sss-team-web-app-main(1)\sss-team-web-app-main\src\integrations\supabase\types.ts'

def find_tables():
    try:
        with open(types_path, 'r', encoding='utf-16') as f:
            content = f.read()
    except Exception as e:
        print(f"Failed to read with UTF-16: {e}")
        return

    # Look for the public: { tables: { ... } } structure
    public_match = re.search(r'public:\s*\{.*?tables:\s*\{(.*?)\s*\}', content, re.DOTALL)
    if public_match:
        tables_block = public_match.group(1)
        # Find all keys in the tables block
        tables = re.findall(r'(\w+):\s*\{', tables_block)
        print("Tables found in public schema:", sorted(list(set(tables))))
    else:
        print("Could not find public tables block")
        # Try a broader search for any key followed by : { Row:
        tables = re.findall(r'(\w+):\s*\{\s*Row:', content)
        print("Broad table search:", sorted(list(set(tables))))

if __name__ == "__main__":
    find_tables()
