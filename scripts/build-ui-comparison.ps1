param(
  [Parameter(Mandatory = $true)]
  [string]$ReferencePath,

  [Parameter(Mandatory = $true)]
  [string]$ActualPath,

  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputDir,

  [string]$ScreenId = "SCR-002A"
)

$ErrorActionPreference = "Stop"

foreach ($path in @($ReferencePath, $ActualPath, $ManifestPath)) {
  if (!(Test-Path $path)) {
    throw "Required visual-baseline input is missing: $path"
  }
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$baseline = $manifest.screens | Where-Object { $_.screenId -eq $ScreenId } | Select-Object -First 1
if ($null -eq $baseline) {
  throw "No baseline entry found for $ScreenId."
}

$referenceHash = (Get-FileHash $ReferencePath -Algorithm SHA256).Hash.ToLower()
$actualHash = (Get-FileHash $ActualPath -Algorithm SHA256).Hash.ToLower()

if ($referenceHash -ne $baseline.reference.sha256) {
  throw "Frozen reference hash drift for $ScreenId. Actual=$referenceHash Expected=$($baseline.reference.sha256)"
}

if ($actualHash -ne $baseline.implementation.sha256) {
  throw "Implementation screenshot drift for $ScreenId. Actual=$actualHash Expected=$($baseline.implementation.sha256). Review against the frozen reference before updating the baseline."
}

Add-Type -AssemblyName System.Drawing

$reference = [System.Drawing.Image]::FromFile((Resolve-Path $ReferencePath))
$actual = [System.Drawing.Image]::FromFile((Resolve-Path $ActualPath))

try {
  if (
    $reference.Width -ne $baseline.reference.width -or
    $reference.Height -ne $baseline.reference.height
  ) {
    throw "Frozen reference dimensions drifted: $($reference.Width)x$($reference.Height)."
  }

  if (
    $actual.Width -ne $baseline.implementation.width -or
    $actual.Height -ne $baseline.implementation.height
  ) {
    throw "Implementation screenshot dimensions drifted: $($actual.Width)x$($actual.Height)."
  }

  New-Item -ItemType Directory -Force $OutputDir | Out-Null

  $scaledActual = New-Object System.Drawing.Bitmap(
    $reference.Width,
    $reference.Height
  )
  $scaledGraphics = [System.Drawing.Graphics]::FromImage($scaledActual)
  try {
    $scaledGraphics.InterpolationMode =
      [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $scaledGraphics.PixelOffsetMode =
      [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $scaledGraphics.SmoothingMode =
      [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $scaledGraphics.DrawImage(
      $actual,
      0,
      0,
      $reference.Width,
      $reference.Height
    )
  }
  finally {
    $scaledGraphics.Dispose()
  }

  $headerHeight = 32
  $comparison = New-Object System.Drawing.Bitmap(
    ($reference.Width * 2),
    ($reference.Height + $headerHeight)
  )
  $graphics = [System.Drawing.Graphics]::FromImage($comparison)

  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.DrawImage($reference, 0, $headerHeight)
    $graphics.DrawImage($scaledActual, $reference.Width, $headerHeight)

    $divider = New-Object System.Drawing.Pen(
      [System.Drawing.Color]::FromArgb(215, 222, 232),
      1
    )
    $font = New-Object System.Drawing.Font(
      "Segoe UI",
      9,
      [System.Drawing.FontStyle]::Bold
    )
    $brush = New-Object System.Drawing.SolidBrush(
      [System.Drawing.Color]::FromArgb(31, 41, 55)
    )

    try {
      $graphics.DrawLine(
        $divider,
        $reference.Width,
        0,
        $reference.Width,
        $comparison.Height
      )
      $graphics.DrawString(
        "FROZEN REFERENCE — UI-IMG-002A",
        $font,
        $brush,
        8,
        8
      )
      $graphics.DrawString(
        "IMPLEMENTATION — SCR-002A",
        $font,
        $brush,
        ($reference.Width + 8),
        8
      )
    }
    finally {
      $divider.Dispose()
      $font.Dispose()
      $brush.Dispose()
    }

    $comparisonPath = Join-Path $OutputDir "$ScreenId-side-by-side.png"
    $comparison.Save(
      $comparisonPath,
      [System.Drawing.Imaging.ImageFormat]::Png
    )
  }
  finally {
    $graphics.Dispose()
    $comparison.Dispose()
    $scaledActual.Dispose()
  }

  $evidence = [ordered]@{
    schemaVersion = 1
    screenId = $ScreenId
    imageId = $baseline.imageId
    promptId = $baseline.promptId
    referencePackId = $manifest.referencePackId
    freezeId = $manifest.freezeId
    reference = [ordered]@{
      path = $ReferencePath
      width = $reference.Width
      height = $reference.Height
      sha256 = $referenceHash
      source = $baseline.reference.source
    }
    implementation = [ordered]@{
      path = $ActualPath
      width = $actual.Width
      height = $actual.Height
      sha256 = $actualHash
      canonicalViewport = $baseline.implementation.canonicalViewport
    }
    comparison = [ordered]@{
      policy = $baseline.comparisonPolicy
      visualReview = $baseline.visualReview
      sideBySide = "$ScreenId-side-by-side.png"
      strictImplementationHashGate = $true
      strictFrozenReferenceHashGate = $true
      strictCrossImagePixelThreshold = $false
    }
  }

  $evidence |
    ConvertTo-Json -Depth 8 |
    Set-Content -Encoding utf8 (Join-Path $OutputDir "$ScreenId-comparison.json")

  Write-Host "Visual baseline PASS: $ScreenId"
  Write-Host "Frozen reference SHA256: $referenceHash"
  Write-Host "Implementation SHA256: $actualHash"
}
finally {
  $reference.Dispose()
  $actual.Dispose()
}
