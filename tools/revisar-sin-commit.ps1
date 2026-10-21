# Revisa todos los repos de Phoenix y avisa de lo que está sin commit o sin subir.
# Solo LEE: no hace commit, no borra, no cambia de rama, no toca permisos.
#
# Uso (PowerShell):
#   powershell -ExecutionPolicy Bypass -File C:\dev\pes-liga-automatica\tools\revisar-sin-commit.ps1
#   ... -Respaldar   -> además guarda una foto de los cambios en una rama local respaldo/sin-commit-AAAA-MM-DD
#                       (usa "git stash create": no toca la carpeta de trabajo ni la pila de stash, y NO sube nada)
#
# Costumbre: correrlo al empezar y al cerrar cada avance. Si sale algo en ROJO, quien hizo esos
# cambios los commitea (o los añade a .gitignore si son logs o compilados).
param([switch]$Respaldar, [int]$DiasAviso = 1)

$repos = @(
  'C:\dev\pes-liga-automatica',
  'C:\dev\pes-rediseno',
  'C:\dev\smash-soda-fork',
  'C:\dev\phoenix-overlay',
  'D:\Frank\IA\CLAUDE\phoenixevolution',
  'D:\Frank\IA\CLAUDE\pes-borrador'
)
# Archivos que son ruido (logs, compilados, respaldos): se cuentan aparte.
$ruido = '(^|/)(log_[^/]*\.txt|[^/]*\.log|[^/]*\.bak|build-[^/]*/|dist/|_mis_cambios/|\.impeccable/|\.claude/|COMPILAR_PHOENIX\.bat)'

$hayProblemas = $false
foreach ($r in $repos) {
  if (-not (Test-Path (Join-Path $r '.git'))) { continue }
  $rama = (git -C $r branch --show-current) 2>$null
  if (-not $rama) { $rama = '(sin rama: HEAD suelto)' }
  $lineas = @(git -C $r status --porcelain 2>$null | Where-Object { $_ })
  $reales = @($lineas | Where-Object { ($_.Substring(3) -replace '\\','/') -notmatch $ruido })
  $nRuido = $lineas.Count - $reales.Count
  $sinSubir = (git -C $r rev-list --count '@{u}..HEAD' 2>$null)
  if (-not $sinSubir) { $sinSubir = '?' }

  # Antigüedad del cambio real más viejo
  $dias = 0
  foreach ($l in $reales) {
    $f = Join-Path $r ($l.Substring(3).Trim('"'))
    if (Test-Path $f) {
      $d = ((Get-Date) - (Get-Item $f).LastWriteTime).Days
      if ($d -gt $dias) { $dias = $d }
    }
  }

  $color = 'Green'
  if ($reales.Count -gt 0 -or ($sinSubir -ne '0' -and $sinSubir -ne '?')) { $color = 'Yellow' }
  if ($reales.Count -gt 0 -and $dias -ge $DiasAviso) { $color = 'Red'; $hayProblemas = $true }

  Write-Host ("{0}  [{1}]" -f $r, $rama) -ForegroundColor $color
  Write-Host ("   sin commit: {0} reales, {1} de ruido | commits sin subir: {2} | el más viejo: {3} días" -f $reales.Count, $nRuido, $sinSubir, $dias)
  $reales | Select-Object -First 8 | ForEach-Object { Write-Host "      $_" }
  if ($reales.Count -gt 8) { Write-Host ("      ... y {0} más" -f ($reales.Count - 8)) }

  if ($Respaldar -and $reales.Count -gt 0) {
    $foto = (git -C $r stash create "respaldo sin commit $(Get-Date -Format s)") 2>$null
    if ($foto) {
      $nombre = "respaldo/sin-commit-$(Get-Date -Format yyyy-MM-dd)"
      git -C $r branch -f $nombre $foto 2>$null | Out-Null
      Write-Host "   foto guardada en la rama local $nombre (solo cambios en archivos ya versionados)" -ForegroundColor Cyan
    }
  }
}
if ($hayProblemas) {
  Write-Host "`nHay cambios reales sin commit de hace $DiasAviso día(s) o más. Commitéalos o añádelos a .gitignore." -ForegroundColor Red
  exit 1
}
Write-Host "`nTodo en orden." -ForegroundColor Green
