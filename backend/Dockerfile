# ASP.NET Core API. Build from backend/:  docker build -t restaurant-api .
# The image also holds an EF Core migration bundle (/app/efbundle), which creates/updates and seeds the database:
#   docker run --rm -e ConnectionStrings__DefaultConnection=... restaurant-api ./efbundle

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the package layer is cached until backend.csproj changes.
COPY backend.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Migration bundle: runs the migrations and UseSeeding from Program.cs without needing the SDK at runtime.
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"
RUN dotnet ef migrations bundle -o /app/publish/efbundle


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# The base image's non-root user; the API listens on 8080 (ASPNETCORE_HTTP_PORTS in the base image).
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "backend.dll"]
