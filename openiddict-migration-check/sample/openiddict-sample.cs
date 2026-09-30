using Duende.IdentityServer;
using Duende.IdentityServer.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();

builder.Services.AddIdentityServer(options =>
    {
        options.Events.RaiseErrorEvents = true;
        options.Events.RaiseFailureEvents = true;
        options.EmitStaticAudienceClaim = true;
    })
    .AddInMemoryIdentityResources(Config.IdentityResources)
    .AddInMemoryApiScopes(Config.ApiScopes)
    .AddInMemoryClients(Config.Clients)
    .AddServerSideSessions()
    .AddTestUsers(TestUsers.Users);

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.UseIdentityServer();
app.UseAuthorization();
app.MapRazorPages();
app.Run();

public static class Config
{
    public static IEnumerable<IdentityResource> IdentityResources =>
        new IdentityResource[] { new IdentityResources.OpenId(), new IdentityResources.Profile() };

    public static IEnumerable<ApiScope> ApiScopes =>
        new ApiScope[] { new ApiScope("orders.read"), new ApiScope("orders.write") };

    public static IEnumerable<Client> Clients =>
        new Client[]
        {
            new Client
            {
                ClientId = "billing-worker",
                ClientSecrets = { new Secret("worker-secret".Sha256()) },
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                AllowedScopes = { "orders.read" }
            },
            new Client
            {
                ClientId = "web",
                ClientSecrets = { new Secret("web-secret".Sha256()) },
                AllowedGrantTypes = GrantTypes.Code,
                RedirectUris = { "https://shop.example.com/signin-oidc" },
                AllowedScopes = { "openid", "profile", "orders.read", "orders.write" }
            },
            new Client
            {
                ClientId = "mobile",
                RequireClientSecret = false,
                AllowedGrantTypes = GrantTypes.Code,
                RedirectUris = { "com.example.shop:/callback" },
                AllowedScopes = { "openid", "profile", "orders.read" }
            }
        };
}
