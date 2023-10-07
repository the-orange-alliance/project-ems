import os
import zipfile
from pathlib import Path

downloads_path = str(Path.home() / "Downloads")
output_path = str(Path.home() / "Desktop" / "ems-latest")
items = os.listdir(downloads_path)
builds = list(filter(lambda item: 'ems.' in item, items))
print(builds)

input=int(input('Select a build: '))
zip_path = str(downloads_path + '/' + builds[input])

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(path=output_path)
