param(
  [string]$ReferenceDocx = "docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx",
  [string]$EvidenceRoot = "artifacts/step11/T11-W05-07"
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$mapping = [ordered]@{
  "SCR-002C" = "UI-IMG-002C"
  "SCR-003A" = "UI-IMG-003A"
  "SCR-003B" = "UI-IMG-003B"
  "DLG-008" = "UI-IMG-012"
}
$referenceDir = Join-Path $EvidenceRoot "references"
$compareDir = Join-Path $EvidenceRoot "comparison"
New-Item -ItemType Directory -Force $referenceDir, $compareDir | Out-Null
$reports = @()
foreach ($screen in $mapping.Keys) {
  $referenceId = $mapping[$screen]
  $referencePath = Join-Path $referenceDir "$screen-reference.jpg"
  & ./scripts/extract-ui-reference.ps1 -DocxPath $ReferenceDocx -ImageId $referenceId -OutputPath $referencePath
  $shotPath = Join-Path (Join-Path $EvidenceRoot "screenshots") "$screen.png"
  $domPath = Join-Path (Join-Path $EvidenceRoot "screenshots") "$screen-dom.json"
  if (!(Test-Path $shotPath) -or !(Test-Path $domPath)) {
    throw "Missing W05-07 implementation screenshot/DOM for $screen"
  }
  $dom = Get-Content $domPath -Raw | ConvertFrom-Json
  if ($dom.mode -ne $screen -or !$dom.frozen.hasGemini -or !$dom.frozen.hasLeftTabs -or !$dom.frozen.hasAlbumTimeline) {
    throw "Frozen W05-07 screen DOM hierarchy failure: $screen"
  }
  if ($dom.capture.width -ne 1600 -or $dom.capture.height -ne 1000) {
    throw "Unexpected frozen W05-07 screenshot geometry for $screen"
  }
  $ref = [System.Drawing.Image]::FromFile((Resolve-Path $referencePath))
  $actual = [System.Drawing.Image]::FromFile((Resolve-Path $shotPath))
  try {
    $w = $ref.Width
    $h = $ref.Height
    $header = 32
    $comparison = [System.Drawing.Bitmap]::new(($w * 2), ($h + $header))
    $g = [System.Drawing.Graphics]::FromImage($comparison)
    try {
      $g.Clear([System.Drawing.Color]::White)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($ref, 0, $header, $w, $h)
      $g.DrawImage($actual, $w, $header, $w, $h)
      $font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
      $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(31,41,55))
      try {
        $g.DrawString("FROZEN REFERENCE: $referenceId", $font, $brush, 8, 6)
        $g.DrawString("REAL ELECTRON: $screen", $font, $brush, ($w + 8), 6)
      } finally {
        $font.Dispose()
        $brush.Dispose()
      }
      $comparison.Save((Join-Path $compareDir "$screen-side-by-side.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $g.Dispose()
      $comparison.Dispose()
    }
    $reports += [ordered]@{
      screenId = $screen
      referenceImageId = $referenceId
      referenceSha256 = (Get-FileHash $referencePath -Algorithm SHA256).Hash.ToLower()
      implementationSha256 = (Get-FileHash $shotPath -Algorithm SHA256).Hash.ToLower()
      referenceGeometry = "$($ref.Width)x$($ref.Height)"
      implementationGeometry = "$($actual.Width)x$($actual.Height)"
      frozenShellVerified = $true
      comparisonArtifact = "$screen-side-by-side.png"
      crossImagePixelThresholdUsed = $false
      visualReview = "SIDE_BY_SIDE_REVIEW_REQUIRED"
    }
  } finally {
    $ref.Dispose()
    $actual.Dispose()
  }
}
$evidence = [ordered]@{
  schemaVersion = 1
  task = "T11-W05-07"
  referencePack = "LFA-UI-REFERENCE-v1.1"
  frozenScreens = $reports
  policy = "Compact lossy generated mockups vs 1600x1000 production. Preserve side-by-side evidence and do not invent pixel-exact equality or approve visual drift without review."
}
$evidence | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $compareDir "UI_COMPARISON_SUMMARY.json")
Write-Host "W05-07 real Electron captures/reference extraction/geometry and shell checks PASS for 4 frozen states; side-by-side visual review remains recorded."
