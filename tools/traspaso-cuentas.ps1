# Revisor del TRASPASO entre cuentas de Claude: dice que cambio desde la ultima entrada de TRASPASO.md.
# Solo LEE: hace "git fetch" (nunca pull, commit, borrar ni cambiar de rama) y lista archivos cambiados.
#
# Uso (PowerShell):
#   powershell -ExecutionPolicy Bypass -File C:\dev\pes-liga-automatica\tools\traspaso-cuentas.ps1
#   ... -Desde "2026-10-24 11:40"   -> usa esa fecha en vez de la de la ultima entrada
#   ... -SinFetch                    -> no consulta GitHub (solo lo local)
#
# Costumbre: correrlo al EMPEZAR en una cuenta, sobre todo si antes trabajo la otra. Ver TRASPASO.md seccion 2.
param([string]$Desde = '', [switch]$SinFetch, [int]$Max = 40)

$web = 'C:\dev\pes-liga-automatica'
$traspaso = Join-Path $web 'TRASPASO.md'

# 1. Fecha de la ultima entrada (titulos "### AAAA-MM-DD HH:MM (Lima) · Cuenta N · ...")
$ultima = ''
if (Test-Path $traspaso) {
  $titulos = Select-String -Path $traspaso -Pattern '^### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \(Lima\)(.*)$' -Encoding UTF8
  if ($titulos) {
    $t = $titulos[-1].Matches[0]
    $ultima = $t.Groups[1].Value
    Write-Host ("Ultima entrada de TRASPASO.md: {0}{1}" -f $ultima, $t.Groups[2].Value) -ForegroundColor Cyan
  }
}
if (-not $Desde) { $Desde = $ultima }
if (-not $Desde) { $Desde = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd HH:mm') }
$fecha = [datetime]::ParseExact($Desde, 'yyyy-MM-dd HH:mm', $null)
Write-Host ("Buscando cambios desde: {0} (hora de Lima)`n" -f $Desde) -ForegroundColor Cyan
Write-Host "Ojo: si la entrada de TRASPASO.md en GitHub es mas nueva que la de la PC, primero haz git pull en $web." -ForegroundColor DarkGray

# 2. Repos de git: rama, sin commit, sin subir y commits nuevos (locales y de GitHub)
$repos = @(
  @{ n = 'Web';     p = 'C:\dev\pes-liga-automatica';          r = 'borrador' },
  @{ n = 'Link';    p = 'C:\dev\smash-soda-fork\_phoenix-link'; r = 'plan-ux' },
  @{ n = 'Sync';    p = 'C:\dev\smash-soda-fork';               r = 'mercado-fase0' },
  @{ n = 'Overlay'; p = 'C:\dev\phoenix-overlay';               r = 'main' }
)
foreach ($x in $repos) {
  if (-not (Test-Path $x.p)) { Write-Host ("[{0}] no existe {1}" -f $x.n, $x.p) -ForegroundColor DarkGray; continue }
  if (-not $SinFetch) { git -C $x.p fetch origin $x.r --quiet 2>$null | Out-Null }
  $rama = (git -C $x.p branch --show-current) 2>$null
  $sinCommit = @(git -C $x.p status --porcelain 2>$null | Where-Object { $_ })
  $sinSubir = (git -C $x.p rev-list --count '@{u}..HEAD' 2>$null); if (-not $sinSubir) { $sinSubir = '?' }
  $porBajar = (git -C $x.p rev-list --count ("HEAD..origin/" + $x.r) 2>$null); if (-not $porBajar) { $porBajar = '?' }
  $color = 'Green'
  if ($sinCommit.Count -gt 0 -or $sinSubir -notin @('0', '?') -or $porBajar -notin @('0', '?')) { $color = 'Yellow' }
  if ($rama -ne $x.r) { $color = 'Red' }
  Write-Host ("[{0}] {1}  rama: {2} (deberia ser {3})" -f $x.n, $x.p, $rama, $x.r) -ForegroundColor $color
  Write-Host ("   sin commit: {0} | commits sin subir: {1} | commits en GitHub por bajar: {2}" -f $sinCommit.Count, $sinSubir, $porBajar)
  $sinCommit | Select-Object -First 8 | ForEach-Object { Write-Host "      $_" }
  $nuevos = @(git -C $x.p log ("origin/" + $x.r) --since="$Desde" --format='%h %ad %s' --date=format:'%m-%d %H:%M' 2>$null)
  if ($nuevos.Count -gt 0) {
    Write-Host ("   commits nuevos en GitHub desde la marca ({0}):" -f $nuevos.Count) -ForegroundColor Yellow
    $nuevos | Select-Object -First 15 | ForEach-Object { Write-Host "      $_" }
  } else { Write-Host '   commits nuevos en GitHub desde la marca: ninguno' }
}

# 3. Carpetas fuera de git: archivos cambiados desde la marca
$carpetas = @(
  @{ n = 'Modulos de Sider instalados'; p = 'D:\Frank\Games_\Conmegol Patch\SiderAddons\modules'; prof = 1 },
  @{ n = 'sider.ini';                   p = 'D:\Frank\Games_\Conmegol Patch\SiderAddons';         prof = 0 },
  @{ n = 'Investigacion PES';           p = 'D:\Frank\Games_\PRUEBA_CANCHA';                      prof = 4 },
  @{ n = 'Instaladores de betas';       p = 'C:\dev\phoenix-beta2-dist';                           prof = 2 },
  @{ n = 'Hub de Claude';               p = 'D:\Frank\IA\CLAUDE';                                  prof = 1 },
  @{ n = 'Kit de traspaso';             p = 'C:\dev\TRASPASO-CUENTAS';                             prof = 1 }
)
$ignorar = '\\(copias|ghidra_proyecto_completo|\.git|node_modules)\\'
Write-Host "`nArchivos cambiados FUERA de git desde la marca:" -ForegroundColor Cyan
foreach ($c in $carpetas) {
  if (-not (Test-Path $c.p)) { Write-Host ("[{0}] no existe {1}" -f $c.n, $c.p) -ForegroundColor DarkGray; continue }
  $f = @(Get-ChildItem -Path $c.p -File -Recurse -Depth $c.prof -ErrorAction SilentlyContinue |
         Where-Object { $_.LastWriteTime -gt $fecha -and $_.FullName -notmatch $ignorar } |
         Sort-Object LastWriteTime -Descending)
  $color = 'Green'; if ($f.Count -gt 0) { $color = 'Yellow' }
  Write-Host ("[{0}] {1}: {2} archivo(s)" -f $c.n, $c.p, $f.Count) -ForegroundColor $color
  $f | Select-Object -First $Max | ForEach-Object { Write-Host ("      {0:MM-dd HH:mm}  {1}" -f $_.LastWriteTime, $_.FullName.Substring($c.p.Length).TrimStart('\')) }
  if ($f.Count -gt $Max) { Write-Host ("      ... y {0} mas" -f ($f.Count - $Max)) }
}
Write-Host "`nSi algo de esto no aparece en la ultima entrada de TRASPASO.md, lo hizo la otra cuenta sin anotarlo: revisalo y avisale a Fralex en una linea." -ForegroundColor Cyan
