import os
import zipfile
import requests
from github import Github
from github import Auth
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("./../front-end/.env")
github_token = os.getenv("VITE_GITHUB_TOKEN")
auth=Auth.Token(github_token)
git = Github(auth=auth)
repo = git.get_repo("the-orange-alliance/project-ems")
latest_release = repo.get_latest_release()
download_url = latest_release.assets[0].browser_download_url
print(f'Latest release: {latest_release.tag_name}')
print(f'Downloading {download_url}...')

response = requests.get(download_url)

download_path = Path.home() / "Downloads" / "ems-latest.zip"
output_path = Path.home() / "Desktop" / "fgc-2024"

with open(download_path, 'wb') as f:
    f.write(response.content)

print('Done. Extracting...')

with zipfile.ZipFile(download_path, 'r') as zip_ref:
    zip_ref.extractall(path=output_path)

print("Done. Cleaning up...")

os.remove(download_path)

print("Done. Update complete.")
