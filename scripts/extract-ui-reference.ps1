param(
  [Parameter(Mandatory = $true)]
  [string]$DocxPath,

  [Parameter(Mandatory = $true)]
  [string]$ImageId,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $DocxPath)) {
  throw "DOCX not found: $DocxPath"
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("lfa-ui-ref-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "reference.zip"
$expanded = Join-Path $tempRoot "expanded"

New-Item -ItemType Directory -Force $tempRoot | Out-Null
Copy-Item $DocxPath $zipPath
Expand-Archive -Path $zipPath -DestinationPath $expanded -Force

$documentPath = Join-Path $expanded "word/document.xml"
$relsPath = Join-Path $expanded "word/_rels/document.xml.rels"

if (!(Test-Path $documentPath) -or !(Test-Path $relsPath)) {
  throw "DOCX OOXML document parts are incomplete."
}

[xml]$document = Get-Content $documentPath -Raw
[xml]$rels = Get-Content $relsPath -Raw

$ns = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$ns.AddNamespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
$ns.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

$paragraphs = $document.SelectNodes("//w:body//w:p", $ns)
if (!$paragraphs -or $paragraphs.Count -eq 0) {
  throw "No document paragraphs found."
}

$relationshipId = $null
$matchParagraphIndex = -1
$scanLimit = 12

for ($i = 0; $i -lt $paragraphs.Count; $i++) {
  $textNodes = $paragraphs[$i].SelectNodes(".//w:t", $ns)
  $paragraphText = ($textNodes | ForEach-Object { $_."#text" }) -join ""

  if ($paragraphText -notlike "*$ImageId*") {
    continue
  }

  for ($j = $i; $j -lt [Math]::Min($paragraphs.Count, $i + $scanLimit); $j++) {
    $blip = $paragraphs[$j].SelectSingleNode(".//a:blip", $ns)
    if ($null -ne $blip) {
      $embed = $blip.GetAttribute("embed", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
      if ($embed) {
        $relationshipId = $embed
        $matchParagraphIndex = $i
        break
      }
    }
  }

  if ($relationshipId) {
    break
  }
}

if (!$relationshipId) {
  throw "Could not locate an embedded image near $ImageId."
}

$relsNs = New-Object System.Xml.XmlNamespaceManager($rels.NameTable)
$relsNs.AddNamespace("pr", "http://schemas.openxmlformats.org/package/2006/relationships")
$relationship = $rels.SelectSingleNode("//pr:Relationship[@Id='$relationshipId']", $relsNs)

if ($null -eq $relationship) {
  throw "Relationship $relationshipId was not found."
}

$target = [string]$relationship.Target
if (!$target.StartsWith("media/")) {
  throw "Unexpected image relationship target: $target"
}

$sourceImage = Join-Path (Join-Path $expanded "word") $target
if (!(Test-Path $sourceImage)) {
  throw "Embedded image file missing: $sourceImage"
}

New-Item -ItemType Directory -Force (Split-Path $OutputPath -Parent) | Out-Null
Copy-Item $sourceImage $OutputPath -Force

$hash = (Get-FileHash $OutputPath -Algorithm SHA256).Hash.ToLower()
$item = Get-Item $OutputPath

@{
  imageId = $ImageId
  relationshipId = $relationshipId
  sourceTarget = $target
  matchedParagraphIndex = $matchParagraphIndex
  output = $OutputPath
  bytes = $item.Length
  sha256 = $hash
} | ConvertTo-Json | Set-Content -Encoding utf8 ($OutputPath + ".json")

Write-Host "Extracted $ImageId from $target -> $OutputPath"
Write-Host "SHA256: $hash"
