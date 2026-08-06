$ports = 8080..8090
$listener = $null
$port = $null

foreach ($p in $ports) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Prefixes.Add("http://127.0.0.1:$p/")
        $l.Start()
        $listener = $l
        $port = $p
        break
    } catch {
        if ($l -ne $null) {
            $l.Close()
        }
    }
}

if ($listener -eq $null) {
    Write-Error "Could not start server. Ports 8080-8090 might be in use."
    exit 1
}

Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "  Static File Server is running!" -ForegroundColor Green
Write-Host "  Local URL: http://localhost:$port/" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Green

try {
    while ($listener.IsListening) {
        $context = $null
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            Write-Host "$($request.HttpMethod) $($request.Url.LocalPath)" -ForegroundColor Gray
            
            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/") { $urlPath = "/index.html" }
            
            # Replace leading slash and convert to local file path
            $relPath = $urlPath.Substring(1).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $filePath = Join-Path $PSScriptRoot $relPath
            
            # Security check: ensure path is within $PSScriptRoot
            $fullPath = [System.IO.Path]::GetFullPath($filePath)
            $rootPath = [System.IO.Path]::GetFullPath($PSScriptRoot)
            
            if (-not $fullPath.StartsWith($rootPath)) {
                $response.StatusCode = 403
                $response.StatusDescription = "Forbidden"
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                continue
            }
            
            if (Test-Path $fullPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css" { "text/css; charset=utf-8" }
                    ".js" { "application/javascript; charset=utf-8" }
                    ".png" { "image/png" }
                    ".jpg" { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".gif" { "image/gif" }
                    ".svg" { "image/svg+xml" }
                    ".ico" { "image/x-icon" }
                    ".json" { "application/json; charset=utf-8" }
                    default { "application/octet-stream" }
                }
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $response.StatusDescription = "Not Found"
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        } catch {
            Write-Host "Error handling request: $_" -ForegroundColor Red
        } finally {
            if ($null -ne $context -and $null -ne $context.Response) {
                try { $context.Response.OutputStream.Close() } catch {}
            }
        }
    }
} catch {
    Write-Host "Server loop encountered an error: $_" -ForegroundColor Red
} finally {
    if ($listener -ne $null) {
        $listener.Stop()
        $listener.Close()
    }
}
