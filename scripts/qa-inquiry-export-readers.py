"""Read synthetic exports using independent ZIP/XML, Excel and Word readers.

Invoked by qa-inquiry-export.mjs --python <executable>. No local files are written.
"""
import base64
import csv
import io
import json
import sys
import zipfile
from xml.etree import ElementTree

from docx import Document
from openpyxl import load_workbook

payload = json.load(sys.stdin)
data = {kind: base64.b64decode(value) for kind, value in payload.items()}
checks = 0


def check(condition):
    global checks
    assert condition
    checks += 1


for kind in ("xlsx", "docx"):
    with zipfile.ZipFile(io.BytesIO(data[kind])) as package:
        check(package.testzip() is None)
        for name in package.namelist():
            ElementTree.fromstring(package.read(name))
            checks += 1

workbook = load_workbook(io.BytesIO(data["xlsx"]), data_only=False)
check(workbook.sheetnames == ["안내", "기록 목록", "답변", "물품"])
cells = [cell for sheet in workbook for row in sheet for cell in row]
check(not any(cell.data_type == "f" for cell in cells))
check(any(cell.value == "001234567890123456" and cell.data_type == "s" for cell in cells))
check(any(cell.value == 23000 and cell.data_type == "n" for cell in cells))
check(any(cell.value == "작성 당시 질문" for cell in cells))
check(any(isinstance(cell.value, str) and "한국어, 쉼표" in cell.value and "🧪" in cell.value for cell in cells))
for sheet in workbook:
    check(sheet.freeze_panes == "A2")
    check(sheet["A1"].font.bold)
workbook.close()

document = Document(io.BytesIO(data["docx"]))
text = "\n".join(paragraph.text for paragraph in document.paragraphs)
check("작성 당시 질문" in text)
check("한국어, 쉼표 \"인용\" & <태그> 🧪" in text)
check("근거를 보강하세요 & <확인>" in text)
check("합계: 23000원" in text)
check("새 문항 - 내보내기에 없어야 함" not in text)
check(len(document.sections) == 1)
check(document.sections[0].page_width > 0)

rows = list(csv.reader(io.StringIO(data["csv"].decode("utf-8-sig"))))
check(all(len(row) == 19 for row in rows))
check(any(row[11].startswith("'=HYPERLINK(") for row in rows))
check(any(row[14] == "001234567890123456" for row in rows))
check(any(row[18] == "23000" for row in rows))
print(json.dumps({"passed": checks, "readers": "Python zipfile + XML parser, openpyxl, python-docx, CSV"}))
