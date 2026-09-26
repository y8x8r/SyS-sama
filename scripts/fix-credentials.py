#!/usr/bin/env python3
"""Add credentials: "include" to all fetch calls in store.ts that don't have it."""
import re

filepath = "/home/z/my-project/src/lib/store.ts"
with open(filepath, "r") as f:
    content = f.read()

# Pattern 1: fetch("url") without options -> fetch("url", { credentials: "include" })
# Match: fetch("/api/...") with no second argument
def add_credentials_simple(match):
    url = match.group(1)
    return f'fetch("{url}", {{ credentials: "include" }})'

content = re.sub(r'fetch\("(/api/[^"]+)"\)(?!\s*,)', add_credentials_simple, content)

# Pattern 2: fetch(`url`) without options (template literals)
def add_credentials_template(match):
    url = match.group(1)
    return f'fetch(`{url}`, {{ credentials: "include" }})'

content = re.sub(r'fetch\(`([^`]+)`\)(?!\s*,)', add_credentials_template, content)

# Pattern 3: fetch with options object but no credentials
# Find: { method: "...", headers: ... } without credentials
# Add credentials: "include" to the object
def add_credentials_to_options(match):
    prefix = match.group(1)  # fetch("url", or fetch(`url`,
    options = match.group(2)  # { method: ... }
    if 'credentials' in options:
        return match.group(0)  # already has credentials
    # Insert credentials at the beginning of the options object
    new_options = '{ credentials: "include", ' + options[1:]
    return prefix + new_options

# Match fetch calls with options that don't have credentials
content = re.sub(
    r'(fetch\([`"][^`"]+[`"]\s*,\s*)(\{[^}]*\})',
    add_credentials_to_options,
    content
)

with open(filepath, "w") as f:
    f.write(content)

print("Done! All fetch calls now have credentials: include")
