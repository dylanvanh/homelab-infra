import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "public_files", Path(__file__).parents[1] / "scripts/check-public-files.py"
)
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)


class PublicFilesTest(unittest.TestCase):
    def test_private_files_are_rejected(self):
        for path in [".env.production", "k8s/app/secret.yaml", "client.key", "database.dump", "data.sqlite3", "cloudflare-resources.local.json"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                checks.check_file(path, b"private")

    def test_secret_cannot_hide_in_a_deployment_file_or_list(self):
        for content in ["kind: Secret", "kind: List\nitems:\n- kind: Secret"]:
            with self.assertRaises(ValueError):
                checks.check_file("deployment.yaml", content)

    def test_examples_require_placeholders_even_for_base64_data(self):
        for content in [
            "kind: Secret\nstringData:\n  password: accidental-value",
            "kind: Secret\ndata:\n  password: YWJj",
        ]:
            with self.assertRaises(ValueError):
                checks.check_file("secret.yaml.example", content)

    def test_public_config_and_placeholder_examples_pass(self):
        checks.check_file("deployment.yaml", "kind: Deployment")
        checks.check_file("server-ca.crt", "public certificate")
        checks.check_file("secret.yaml.example", "kind: Secret\nstringData:\n  password: REPLACE_WITH_PASSWORD\n  username: app")

    def test_parse_error_does_not_echo_values(self):
        with self.assertRaisesRegex(ValueError, "^invalid YAML or JSON$"):
            checks.check_file("deployment.yaml", "invalid: [private-value")


if __name__ == "__main__":
    unittest.main()
