# wait-mongo.ps1
Write-Host "⏳ Waiting for MongoDB to be ready..."

do {
    try {
        $status = docker inspect --format='{{.State.Health.Status}}' local-mongo
    } catch {
        $status = "starting"
    }
    Write-Host "MongoDB status: $status"
    Start-Sleep -Seconds 2
} until ($status -eq "healthy")

Write-Host "MongoDB is UP!"
Write-Host "You can now access Mongo Express GUI at: http://localhost:8081"
