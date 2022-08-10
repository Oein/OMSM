rm -rd minecraft_server_manager-win32-x64
npx electron-packager ./ minecraft_server_manager --platform=win32 --arch=x64
zip -r minecraft_server_manager-win32-x64.zip minecraft_server_manager-win32-x64
rm -rd minecraft_server_manager-win32-x64