rm -rd minecraft_server_manager-darwin-x64
npx electron-packager ./ minecraft_server_manager --platform=darwin --arch=x64
zip -r minecraft_server_manager-darwin-x64.zip minecraft_server_manager-darwin-x64