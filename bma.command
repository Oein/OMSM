rm -rd minecraft_server_manager-darwin-arm64
npx electron-packager ./ minecraft_server_manager --platform=darwin --arch=arm64
zip -r minecraft_server_manager-darwin-arm64.zip minecraft_server_manager-darwin-arm64