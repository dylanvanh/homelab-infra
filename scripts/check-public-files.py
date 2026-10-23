#!/usr/bin/env python3
"""Check staged files without printing credential values."""

import fnmatch
from pathlib import PurePosixPath
import re
import subprocess
import sys

import yaml

PRIVATE_FILES = (
    ".env", ".env.*", ".dev.vars", ".dev.vars.*", "secret.yaml", "secret.yml",
    "secrets.yaml", "secrets.yml", "*.key", "*.pem", "*.p12", "*.pfx",
    "*kubeconfig*", "*.dump", "*.sqlite*", "*.db", "*.tar", "*.tar.gz",
    "*.tgz", "*.local.json", "cloudflare-resources.json",
)
CREDENTIAL = re.compile(
    r"password|secret|token|private.?key|api.?key|client.?id|database.?url|data-source-name|^ca\.key$",
    re.IGNORECASE,
)
PLACEHOLDER = re.compile(r"REPLACE_WITH_[A-Z0-9_]+")


def check_document(path, document):
    if not isinstance(document, dict):
        return
    if document.get("kind") == "List":
        for item in document.get("items", []):
            check_document(path, item)
    if document.get("kind") != "Secret":
        return
    if not path.endswith(".example"):
        raise ValueError("Kubernetes Secrets must be placeholder examples")
    if document.get("data"):
        raise ValueError("Secret examples must use readable stringData placeholders")
    for key, value in document.get("stringData", {}).items():
        if CREDENTIAL.search(key) and not PLACEHOLDER.fullmatch(str(value)):
            raise ValueError(f"Secret field {key} must be a REPLACE_WITH_ placeholder")


def check_file(path, content):
    name = PurePosixPath(path).name
    if not name.endswith(".example") and any(fnmatch.fnmatch(name, p) for p in PRIVATE_FILES):
        raise ValueError("private file type must not be tracked")
    if name.endswith((".yaml", ".yml", ".json", ".yaml.example", ".yml.example")):
        try:
            for document in yaml.safe_load_all(content):
                check_document(path, document)
        except yaml.YAMLError:
            raise ValueError("invalid YAML or JSON") from None


def main():
    failed = False
    paths = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
    for path in filter(None, paths):
        content = subprocess.check_output(["git", "show", f":{path}"])
        try:
            check_file(path, content)
        except ValueError as error:
            print(f"{path}: {error}", file=sys.stderr)
            failed = True
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
