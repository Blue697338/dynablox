# Build stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app
COPY . .
RUN dotnet restore Roblox.sln
RUN dotnet build -c Release --no-restore Roblox.sln

# Publish stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS publish
WORKDIR /app
COPY --from=build /app .
RUN dotnet publish Roblox.Website/Roblox.Website.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=publish /app/publish .

# Create a startup script that generates appsettings.json for Docker environment
RUN echo '#!/bin/bash\n\
cat > appsettings.json << EOF\n\
{\n\
  "Postgres": "Host=postgres; Database=postgres; Password=Severine3.9; Username=postgres; Maximum Pool Size=20",\n\
  "Redis": "redis:6379",\n\
  "CdnBaseUrl": "",\n\
  "Directories": {\n\
    "Asset": "/app/storage/asset",\n\
    "Storage": "/app/storage",\n\
    "Thumbnails": "/app/storage/thumbnails",\n\
    "GroupIcons": "/app/storage/group",\n\
    "Public": "/app/",\n\
    "XmlTemplates": "/app/UnsecuredContent/XmlTemplates/",\n\
    "JsonData": "/app/UnsecuredContent/JsonData/",\n\
    "AdminBundle": "/app/admin",\n\
    "EconomyChatBundle": "/app/web"\n\
  },\n\
  "BaseUrl": "http://localhost/",\n\
  "HCaptcha": {\n\
    "Public": "10000000-ffff-ffff-ffff-000000000001",\n\
    "Private": "0x0000000000000000000000000000000000000000"\n\
  },\n\
  "GameServerAuthorization": "90WGEGNJGWHIWGOI31900H9GIOGI",\n\
  "BotAuthorization": "UW8U8TU9W9R8RHGRJOGWGOINOOWGNWRNJWWNRJ",\n\
  "RccAuthorization": "90WGEGNJGWHIWGOI31900H9GIOGI",\n\
  "AssetValidation": {\n\
    "BaseUrl": "http://asset-validation:4300",\n\
    "Authorization": "90WGEGNJGWHIWGOI31900H9GIOGI"\n\
  },\n\
  "Render": {\n\
    "BaseUrl": "ws://render:3189",\n\
    "Authorization": "90WGEGNJGWHIWGOI31900H9GIOGI"\n\
  },\n\
  "PackageShirtAssetId": "1",\n\
  "PackagePantsAssetId": "2",\n\
  "PackageLeftArmAssetId": "3",\n\
  "PackageRightArmAssetId": "4",\n\
  "PackageLeftLegAssetId": "5",\n\
  "PackageRightLegAssetId": "6",\n\
  "PackageTorsoAssetId": "7",\n\
  "Twitter": {\n\
    "Bearer": "test"\n\
  },\n\
  "SignupAssetIds": ["1", "2", "3"],\n\
  "SignupAvatarAssetIds": ["1", "2", "3"],\n\
  "OwnerUserId": "3",\n\
  "Authorization": "90WGEGNJGWHIWGOI31900H9GIOGI",\n\
  "Jwt": {\n\
    "Sessions": "g0qiiDZw7jM2l54+7qsuRaymx6nBGdCKT9Kc0bqJB3aZ26rSsPMXfg8uWfUBtTqWenDVy+AQS1jkdrgvUwVSsw=="\n\
  }\n\
}\n\
EOF\n\
exec dotnet Roblox.Website.dll\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 80
ENTRYPOINT ["/app/start.sh"]
