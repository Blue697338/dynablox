# Build stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app
COPY services/Roblox .
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
EXPOSE 80
ENTRYPOINT ["dotnet", "Roblox.Website.dll"]
