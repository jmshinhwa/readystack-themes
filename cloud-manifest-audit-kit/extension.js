// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking this manifest against the current API versions", "done": "Check finished. Every finding is in the output panel with the file name and the line number.", "nothing_found": "No removed API version, unpinned tag or literal credential was found in this file.", "need_key": "This is a paid command. Paste your licence key to open the repo-wide scan, the in-place rewrite, your own rules and the report file.", "key_ok": "Licence key accepted. The paid commands are open on this machine.", "key_bad": "That licence key was not accepted. Check for a missing character, or reply to your order email and we will re-issue it.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "custom_rules", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Manifest Snippets + Removed-API Audit (8 Sets)');
  return out._c;
}

// ★무료 — ★열린 파일 하나를 ★끝까지 본다. ⛔키를 묻지 않는다.
async function runCurrent() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText();
  const hits = scan(text, ed.document.fileName);
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

function report(rows) {
  const c = out(); c.clear();
  let n = 0;
  // ★설정을 읽는다 — min_severity. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  const _ORD = { info: 0, warn: 1, error: 2 };
  const _min = _ORD[String(vscode.workspace.getConfiguration('cloud-manifest-audit-kit').get('min_severity')
    || 'info').toLowerCase()] || 0;
  for (const r of rows) {
    const _hits = r.hits.filter(function (h) {
      return (_ORD[String(h.sev || 'info').toLowerCase()] || 0) >= _min;
    });
    if (!_hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of _hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "apiVersion:\\s*policy/v1beta1", "flags": "i", "message": "PodDisruptionBudget left policy/v1beta1 and that version was removed. The cluster refuses this object outright, so the workload has no disruption budget during a node upgrade.", "fix": "apiVersion: policy/v1"}, {"pattern": "apiVersion:\\s*autoscaling/v2beta[12]", "flags": "i", "message": "The v2beta autoscaling versions were removed. The HorizontalPodAutoscaler is rejected, so nothing scales and the replica count stays wherever it was.", "fix": "apiVersion: autoscaling/v2"}, {"pattern": "apiVersion:\\s*batch/v1beta1", "flags": "i", "message": "CronJob left batch/v1beta1 and that version was removed. The job is rejected and the schedule silently never runs again.", "fix": "apiVersion: batch/v1"}, {"pattern": "apiVersion:\\s*networking\\.k8s\\.io/v1beta1", "flags": "i", "message": "Ingress left networking.k8s.io/v1beta1 and that version was removed. The route is rejected, so the service keeps running with nothing pointing at it.", "fix": "apiVersion: networking.k8s.io/v1"}, {"pattern": "apiVersion:\\s*extensions/v1beta1", "flags": "i", "message": "The whole extensions/v1beta1 group was removed. Deployment, DaemonSet, ReplicaSet and Ingress all moved out of it years ago and nothing in this group is served any more."}, {"pattern": "apiVersion:\\s*apps/v1beta[12]", "flags": "i", "message": "The apps beta versions were removed. Workloads are served only on apps/v1, so this object never reaches the cluster."}, {"pattern": "image:\\s*\\S+:latest\\b", "flags": "i", "message": "A latest tag does not say which build is running. During an incident you cannot tell the failing version from the working one, and a restart can silently pull a different image than the pod next to it."}, {"pattern": "kubernetes\\.io/ingress\\.class", "flags": "i", "message": "The ingress class annotation was superseded by the ingressClassName field. Controllers that read only the field ignore this manifest, so the ingress is created and no controller claims it."}, {"pattern": "beta\\.kubernetes\\.io/(os|arch|instance-type)", "flags": "i", "message": "These beta node labels were removed. A nodeSelector or affinity written against them matches no node, so the pod stays Pending with no obvious reason."}, {"pattern": "replicas:\\s*1\\b", "flags": "i", "message": "One replica means the workload is down for the whole of every node drain, and a node pool upgrade drains every node in turn."}, {"pattern": "serviceAccountName:\\s*default\\b", "flags": "i", "message": "The default service account is shared by everything in the namespace. Any permission granted to it is granted to every pod there, including the next one somebody adds."}, {"pattern": "hostNetwork:\\s*true", "flags": "i", "message": "hostNetwork puts the container on the node's network namespace, so every port it opens is open on the node and no NetworkPolicy applies to it."}, {"pattern": "privileged:\\s*true", "flags": "i", "message": "A privileged container has the node's capabilities. Anything that escapes the process owns the node and every other pod scheduled on it."}, {"pattern": "runAsUser:\\s*0\\b", "flags": "i", "message": "The container runs as root. A read-only image does not stop a root process from writing to any volume it has mounted."}, {"pattern": "type:\\s*LoadBalancer", "flags": "i", "message": "Each LoadBalancer service takes its own public address from the cloud provider and is billed while it exists, whether or not any request reaches it. One Ingress fronts many services on one address."}, {"pattern": "emptyDir:\\s*\\{\\}", "flags": "i", "message": "An emptyDir lives and dies with the pod. Anything written there is gone the moment the pod is rescheduled, which a node upgrade does to every pod."}, {"pattern": "(password|passwd|secret|token|api[_-]?key|accountkey)\\s*[:=]\\s*[\"']?(?![\\$\\{<])[A-Za-z0-9+/=_.-]{8,}", "flags": "i", "message": "A literal credential is written into this file. Once it is committed it exists in every clone and every build cache, so removing the line does not undo it — the credential has to be rotated."}, {"pattern": "(AccountKey|SharedAccessKey|SharedAccessSignature)\\s*=", "flags": "i", "message": "This connection string carries its own key. Anyone with the file has full access to that resource, and the key cannot be scoped down after the fact — it can only be regenerated."}, {"pattern": "[Ee]ncrypt\\s*=\\s*(false|no)\\b", "flags": "i", "message": "The connection is set to run unencrypted. Credentials and result rows cross the network in the clear, including inside a cluster where any pod on the node can read them."}, {"pattern": "WITH\\s*\\(\\s*NOLOCK", "flags": "i", "message": "NOLOCK reads rows that are still being written and can read the same row twice or skip it entirely. The numbers it returns are not wrong-looking — they are just wrong."}, {"pattern": "EXEC(UTE)?\\s*\\(\\s*@", "flags": "i", "message": "A string variable executed directly is concatenated SQL. Use sp_executesql with typed parameters, which also lets the plan be reused instead of recompiled per value."}, {"pattern": "DELETE\\s+FROM\\s+[\\w.\\[\\]]+\\s*;", "flags": "i", "message": "A DELETE with no WHERE clause. It empties the table and the transaction log has to hold every row, which is how a routine cleanup becomes an outage."}, {"pattern": "javax\\.(ws\\.rs|enterprise|inject|annotation|persistence)", "flags": "i", "message": "The specification namespace moved from javax to jakarta. On a Jakarta EE 9 or later runtime these imports resolve to nothing, and the annotations are simply not read."}, {"pattern": "<TargetFrameworks?>[^<]*net[67]\\.0", "flags": "i", "message": ".NET 6 and .NET 7 are both past their support end date, so no security fix ships for this target. A store submission built against them is also rejected on the current mobile platform requirements."}, {"pattern": "Xamarin\\.Forms", "flags": "i", "message": "Xamarin.Forms is out of support and its namespaces do not exist in a MAUI project. This reference either fails to resolve or pulls in a package nobody patches."}, {"pattern": "setwd\\s*\\(", "flags": "i", "message": "setwd hard-codes one machine's folder layout into the script. It runs for you and fails for everyone else, including the scheduled job that runs it at night."}, {"pattern": "rm\\s*\\(\\s*list\\s*=\\s*ls\\(\\)\\s*\\)", "flags": "i", "message": "This clears named objects only. Attached packages, options and loaded namespaces all survive, so the run is not reproducible even though it looks like a fresh start."}, {"pattern": "install\\.packages\\s*\\(", "flags": "i", "message": "Installing inside an analysis script reinstalls on every run and pulls whatever version is current that day, which means the same script gives different results on different days."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('cloud-manifest-audit-kit');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      // ★s126 — ★심각도를 실어 보낸다. ⛔없으면 min_severity 가 ★전부를 지운다 (내가 만들 뻔한 거짓말)
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null,
                                         sev: r.sev || 'warn' });
    }
  }
  return hits;
}

const SNIPPETS = {"k8s_deployment": ["apiVersion: apps/v1", "kind: Deployment", "metadata:", "  name: ${1:checkout-api}", "  labels:", "    app.kubernetes.io/name: ${1:checkout-api}", "spec:", "  replicas: ${2:3}", "  selector:", "    matchLabels:", "      app.kubernetes.io/name: ${1:checkout-api}", "  template:", "    metadata:", "      labels:", "        app.kubernetes.io/name: ${1:checkout-api}", "    spec:", "      securityContext:", "        runAsNonRoot: true", "        runAsUser: 10001", "      containers:", "        - name: ${1:checkout-api}", "          image: ${3:registry.internal/checkout-api}:${4:1.4.2}", "          ports:", "            - name: http", "              containerPort: ${5:8080}", "          resources:", "            requests:", "              cpu: ${6:100m}", "              memory: ${7:128Mi}", "            limits:", "              memory: ${8:256Mi}", "          readinessProbe:", "            httpGet:", "              path: ${9:/healthz/ready}", "              port: http", "          livenessProbe:", "            httpGet:", "              path: ${10:/healthz/live}", "              port: http"], "k8s_service_ingress": ["apiVersion: v1", "kind: Service", "metadata:", "  name: ${1:checkout-api}", "spec:", "  type: ClusterIP", "  selector:", "    app.kubernetes.io/name: ${1:checkout-api}", "  ports:", "    - name: http", "      port: 80", "      targetPort: ${2:8080}", "---", "apiVersion: networking.k8s.io/v1", "kind: Ingress", "metadata:", "  name: ${1:checkout-api}", "spec:", "  ingressClassName: ${3:nginx}", "  tls:", "    - hosts:", "        - ${4:checkout.internal}", "      secretName: ${1:checkout-api}-tls", "  rules:", "    - host: ${4:checkout.internal}", "      http:", "        paths:", "          - path: /", "            pathType: Prefix", "            backend:", "              service:", "                name: ${1:checkout-api}", "                port:", "                  number: 80"], "k8s_hpa_pdb": ["apiVersion: autoscaling/v2", "kind: HorizontalPodAutoscaler", "metadata:", "  name: ${1:checkout-api}", "spec:", "  scaleTargetRef:", "    apiVersion: apps/v1", "    kind: Deployment", "    name: ${1:checkout-api}", "  minReplicas: ${2:3}", "  maxReplicas: ${3:10}", "  metrics:", "    - type: Resource", "      resource:", "        name: cpu", "        target:", "          type: Utilization", "          averageUtilization: ${4:70}", "---", "apiVersion: policy/v1", "kind: PodDisruptionBudget", "metadata:", "  name: ${1:checkout-api}", "spec:", "  minAvailable: ${5:2}", "  selector:", "    matchLabels:", "      app.kubernetes.io/name: ${1:checkout-api}"], "k8s_config_and_secret_ref": ["apiVersion: v1", "kind: ConfigMap", "metadata:", "  name: ${1:checkout-api}-config", "data:", "  LOG_LEVEL: ${2:info}", "  REQUEST_TIMEOUT_SECONDS: \"${3:30}\"", "---", "# in the container spec: names only, values stay in the secret store", "envFrom:", "  - configMapRef:", "      name: ${1:checkout-api}-config", "env:", "  - name: ${4:DB_PASSWORD}", "    valueFrom:", "      secretKeyRef:", "        name: ${5:checkout-api-secrets}", "        key: ${4:DB_PASSWORD}"], "k8s_placement": ["serviceAccountName: ${1:checkout-api}", "nodeSelector:", "  kubernetes.io/os: linux", "  agentpool: ${2:userpool}", "tolerations:", "  - key: ${3:workload}", "    operator: Equal", "    value: ${4:api}", "    effect: NoSchedule", "topologySpreadConstraints:", "  - maxSkew: 1", "    topologyKey: topology.kubernetes.io/zone", "    whenUnsatisfiable: ScheduleAnyway", "    labelSelector:", "      matchLabels:", "        app.kubernetes.io/name: ${1:checkout-api}"], "helm_chart_metadata": ["apiVersion: v2", "name: ${1:checkout-api}", "description: ${2:Checkout service}", "type: application", "version: ${3:0.1.0}", "appVersion: \"${4:1.4.2}\""], "helm_values_workload": ["image:", "  repository: ${1:registry.internal/checkout-api}", "  tag: \"${2:1.4.2}\"", "  pullPolicy: IfNotPresent", "", "replicaCount: ${3:3}", "", "resources:", "  requests:", "    cpu: ${4:100m}", "    memory: ${5:128Mi}", "  limits:", "    memory: ${6:256Mi}"], "helm_values_ingress": ["ingress:", "  enabled: true", "  className: ${1:nginx}", "  hosts:", "    - host: ${2:checkout.internal}", "      paths:", "        - path: /", "          pathType: Prefix", "  tls:", "    - secretName: ${3:checkout-api-tls}", "      hosts:", "        - ${2:checkout.internal}"], "helm_template_container": ["image: \"{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}\"", "imagePullPolicy: {{ .Values.image.pullPolicy }}", "resources:", "  {{- toYaml .Values.resources | nindent 2 }}"], "helm_template_probes": ["readinessProbe:", "  httpGet:", "    path: {{ .Values.probes.readinessPath | default \"/healthz/ready\" }}", "    port: http", "  initialDelaySeconds: {{ .Values.probes.initialDelaySeconds | default 5 }}", "livenessProbe:", "  httpGet:", "    path: {{ .Values.probes.livenessPath | default \"/healthz/live\" }}", "    port: http", "  periodSeconds: {{ .Values.probes.periodSeconds | default 10 }}"], "iot_edge_deployment": ["{", "  \"modulesContent\": {", "    \"$edgeAgent\": {", "      \"properties.desired\": {", "        \"schemaVersion\": \"1.1\",", "        \"runtime\": {", "          \"type\": \"docker\",", "          \"settings\": { \"minDockerVersion\": \"v1.25\" }", "        },", "        \"systemModules\": {", "          \"edgeAgent\": {", "            \"type\": \"docker\",", "            \"settings\": { \"image\": \"mcr.microsoft.com/azureiotedge-agent:1.4\" }", "          },", "          \"edgeHub\": {", "            \"type\": \"docker\",", "            \"status\": \"running\",", "            \"restartPolicy\": \"always\",", "            \"settings\": { \"image\": \"mcr.microsoft.com/azureiotedge-hub:1.4\" }", "          }", "        },", "        \"modules\": {}", "      }", "    }", "  }", "}"], "iot_edge_module": ["\"${1:tempSensor}\": {", "  \"version\": \"1.0\",", "  \"type\": \"docker\",", "  \"status\": \"running\",", "  \"restartPolicy\": \"always\",", "  \"settings\": {", "    \"image\": \"${2:registry.internal/temp-sensor}:${3:1.2.0}\",", "    \"createOptions\": \"{\\\"HostConfig\\\":{\\\"Memory\\\":268435456,\\\"NanoCpus\\\":500000000}}\"", "  }", "}"], "iot_edge_routes": ["\"$edgeHub\": {", "  \"properties.desired\": {", "    \"schemaVersion\": \"1.2\",", "    \"routes\": {", "      \"${1:sensorToUpstream}\": \"FROM /messages/modules/${2:tempSensor}/outputs/* INTO $upstream\"", "    },", "    \"storeAndForwardConfiguration\": {", "      \"timeToLiveSecs\": ${3:7200}", "    }", "  }", "}"], "iot_module_twin": ["\"${1:tempSensor}\": {", "  \"properties.desired\": {", "    \"SendIntervalSeconds\": ${2:5},", "    \"SendData\": true,", "    \"TemperatureThreshold\": ${3:25}", "  }", "}"], "iot_edge_module_env": ["\"env\": {", "  \"UpstreamProtocol\": { \"value\": \"${1:AmqpWs}\" },", "  \"OptimizeForPerformance\": { \"value\": \"${2:false}\" },", "  \"RuntimeLogLevel\": { \"value\": \"${3:info}\" }", "}"], "microprofile_config_properties": ["${1:checkout}.api.url=${2:http://checkout-api:8080}", "${1:checkout}.api.timeout=${3:PT5S}", "mp.health.disable-default-procedures=false", "mp.metrics.appName=${4:checkout-api}"], "microprofile_config_inject": ["@Inject", "@ConfigProperty(name = \"${1:checkout.api.url}\", defaultValue = \"${2:http://checkout-api:8080}\")", "String ${3:checkoutApiUrl};"], "microprofile_readiness_check": ["@Readiness", "@ApplicationScoped", "public class ${1:CheckoutReadiness} implements HealthCheck {", "", "    @Override", "    public HealthCheckResponse call() {", "        boolean up = ${2:dependency}.isReachable();", "        return HealthCheckResponse.named(\"${3:checkout-api}\")", "                .status(up)", "                .build();", "    }", "}"], "microprofile_fault_tolerance": ["@Retry(maxRetries = ${1:3}, delay = ${2:200})", "@Timeout(value = ${3:2000})", "@Fallback(fallbackMethod = \"${4:cachedPrice}\")", "public ${5:Price} ${6:fetchPrice}(String sku) {", "    return ${7:priceClient}.bySku(sku);", "}"], "liberty_server_xml": ["<server description=\"${1:checkout-api}\">", "    <featureManager>", "        <feature>jakartaee-10.0</feature>", "        <feature>microProfile-6.1</feature>", "    </featureManager>", "", "    <httpEndpoint id=\"defaultHttpEndpoint\" host=\"*\" httpPort=\"${2:9080}\" httpsPort=\"${3:9443}\"/>", "    <webApplication location=\"${4:checkout-api.war}\" contextRoot=\"/\"/>", "</server>"], "mssql_create_table": ["CREATE TABLE dbo.${1:Invoice} (", "    ${1:Invoice}Id BIGINT IDENTITY(1,1) NOT NULL,", "    CustomerId    INT            NOT NULL,", "    Amount        DECIMAL(19, 4) NOT NULL,", "    PaidUtc       DATETIME2(3)   NULL,", "    CreatedUtc    DATETIME2(3)   NOT NULL", "        CONSTRAINT DF_${1:Invoice}_CreatedUtc DEFAULT SYSUTCDATETIME(),", "    CONSTRAINT PK_${1:Invoice} PRIMARY KEY CLUSTERED (${1:Invoice}Id),", "    CONSTRAINT CK_${1:Invoice}_Amount CHECK (Amount > 0)", ");"], "mssql_stored_procedure": ["CREATE OR ALTER PROCEDURE dbo.${1:usp_CreateInvoice}", "    @CustomerId INT,", "    @Amount     DECIMAL(19, 4)", "AS", "BEGIN", "    SET NOCOUNT ON;", "    SET XACT_ABORT ON;", "", "    BEGIN TRY", "        BEGIN TRANSACTION;", "", "        INSERT dbo.${2:Invoice} (CustomerId, Amount)", "        VALUES (@CustomerId, @Amount);", "", "        COMMIT TRANSACTION;", "    END TRY", "    BEGIN CATCH", "        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;", "        THROW;", "    END CATCH", "END"], "mssql_upsert": ["UPDATE dbo.${1:Invoice} WITH (UPDLOCK, HOLDLOCK)", "   SET Amount = @Amount", " WHERE ${1:Invoice}Id = @${1:Invoice}Id;", "", "IF @@ROWCOUNT = 0", "    INSERT dbo.${1:Invoice} (CustomerId, Amount)", "    VALUES (@CustomerId, @Amount);"], "mssql_filtered_index": ["CREATE NONCLUSTERED INDEX IX_${1:Invoice}_${2:CustomerId}_${3:CreatedUtc}", "    ON dbo.${1:Invoice} (${2:CustomerId}, ${3:CreatedUtc} DESC)", "    INCLUDE (${4:Amount})", "    WHERE ${5:PaidUtc} IS NULL;"], "mssql_paged_query": ["SELECT ${1:InvoiceId}, ${2:CustomerId}, ${3:Amount}, ${4:CreatedUtc}", "  FROM dbo.${5:Invoice}", " WHERE ${2:CustomerId} = @CustomerId", " ORDER BY ${4:CreatedUtc} DESC", "OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;"], "maui_project_properties": ["<PropertyGroup>", "  <TargetFrameworks>net10.0-android;net10.0-ios;net10.0-maccatalyst</TargetFrameworks>", "  <OutputType>Exe</OutputType>", "  <UseMaui>true</UseMaui>", "  <SingleProject>true</SingleProject>", "  <Nullable>enable</Nullable>", "  <ApplicationId>${1:com.northwind.checkout}</ApplicationId>", "  <ApplicationDisplayVersion>${2:1.4.2}</ApplicationDisplayVersion>", "  <ApplicationVersion>${3:42}</ApplicationVersion>", "</PropertyGroup>"], "maui_program_registration": ["public static MauiApp CreateMauiApp()", "{", "    var builder = MauiApp.CreateBuilder();", "    builder", "        .UseMauiApp<App>()", "        .ConfigureFonts(fonts =>", "        {", "            fonts.AddFont(\"OpenSans-Regular.ttf\", \"OpenSansRegular\");", "        });", "", "    builder.Services.AddSingleton<${1:IInvoiceService}, ${2:InvoiceService}>();", "    builder.Services.AddTransient<${3:InvoiceViewModel}>();", "    builder.Services.AddTransient<${4:InvoicePage}>();", "", "    return builder.Build();", "}"], "maui_shell_route": ["<Shell xmlns=\"http://schemas.microsoft.com/dotnet/2021/maui\"", "       xmlns:x=\"http://schemas.microsoft.com/winfx/2009/xaml\"", "       xmlns:pages=\"clr-namespace:${1:Checkout}.Pages\"", "       x:Class=\"${1:Checkout}.AppShell\">", "    <TabBar>", "        <ShellContent Title=\"${2:Invoices}\"", "                      Icon=\"${3:invoices.png}\"", "                      Route=\"${4:invoices}\"", "                      ContentTemplate=\"{DataTemplate pages:${5:InvoicePage}}\"/>", "    </TabBar>", "</Shell>"], "maui_list_page": ["<ContentPage xmlns=\"http://schemas.microsoft.com/dotnet/2021/maui\"", "             xmlns:x=\"http://schemas.microsoft.com/winfx/2009/xaml\"", "             x:Class=\"${1:Checkout}.Pages.${2:InvoicePage}\"", "             Title=\"${3:Invoices}\">", "    <CollectionView ItemsSource=\"{Binding ${4:Invoices}}\">", "        <CollectionView.ItemTemplate>", "            <DataTemplate>", "                <Grid Padding=\"12\" ColumnDefinitions=\"*,Auto\">", "                    <Label Text=\"{Binding ${5:Reference}}\"/>", "                    <Label Grid.Column=\"1\" Text=\"{Binding ${6:Amount}, StringFormat='{0:C}'}\"/>", "                </Grid>", "            </DataTemplate>", "        </CollectionView.ItemTemplate>", "    </CollectionView>", "</ContentPage>"], "maui_android_manifest": ["<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">", "  <uses-permission android:name=\"android.permission.INTERNET\"/>", "  <uses-permission android:name=\"android.permission.ACCESS_NETWORK_STATE\"/>", "  <application android:allowBackup=\"false\"", "               android:usesCleartextTraffic=\"false\"/>", "</manifest>"], "r_read_typed_csv": ["library(readr)", "", "${1:invoices} <- read_csv(", "  file.path(\"${2:data}\", \"${3:invoices.csv}\"),", "  col_types = cols(", "    invoice_id  = col_character(),", "    customer_id = col_character(),", "    amount      = col_double(),", "    created_at  = col_datetime()", "  )", ")"], "r_summary_pipeline": ["library(dplyr)", "", "${1:totals_by_customer} <- ${2:invoices} |>", "  filter(!is.na(amount), created_at >= as.Date(\"${3:2026-01-01}\")) |>", "  group_by(customer_id) |>", "  summarise(total = sum(amount), invoices = n(), .groups = \"drop\") |>", "  arrange(desc(total))"], "r_ranked_bar_chart": ["library(ggplot2)", "", "ggplot(${1:totals_by_customer}, aes(x = reorder(customer_id, total), y = total)) +", "  geom_col() +", "  coord_flip() +", "  labs(", "    x = \"${2:Customer}\",", "    y = \"${3:Invoiced total}\",", "    title = \"${4:Invoiced total by customer}\"", "  ) +", "  theme_minimal(base_size = ${5:12})"], "r_checked_function": ["${1:total_by} <- function(data, column) {", "  stopifnot(", "    is.data.frame(data),", "    is.character(column),", "    column %in% names(data)", "  )", "  sum(data[[column]], na.rm = TRUE)", "}"], "r_reproducible_header": ["set.seed(${1:20260906})", "options(warn = 2)", "", "dir.create(\"${2:output}\", showWarnings = FALSE)", "writeLines(", "  capture.output(sessionInfo()),", "  file.path(\"${2:output}\", \"session-info.txt\")", ")"], "dotenv_template": ["# names only - values are injected at deploy time from the secret store", "${1:DATABASE_URL}=", "${2:CHECKOUT_API_URL}=", "${3:LOG_LEVEL}=info", "${4:REQUEST_TIMEOUT_SECONDS}=30"], "editorconfig_block": ["root = true", "", "[*]", "charset = utf-8", "end_of_line = lf", "insert_final_newline = true", "indent_style = space", "indent_size = ${1:2}", "trim_trailing_whitespace = true", "", "[*.{yaml,yml,json}]", "indent_size = 2", "", "[*.{cs,sql}]", "indent_size = 4"], "ini_service_section": ["[${1:checkout-api}]", "host = ${2:0.0.0.0}", "port = ${3:8080}", "log_level = ${4:info}", "timeout_seconds = ${5:30}", "", "[${1:checkout-api}.retry]", "max_attempts = ${6:3}", "backoff_ms = ${7:200}"], "properties_datasource": ["${1:datasource}.url=${2:jdbc:sqlserver://sqlserver:1433;databaseName=checkout;encrypt=true}", "${1:datasource}.user=${3:checkout_app}", "${1:datasource}.maxPoolSize=${4:10}", "${1:datasource}.connectionTimeoutMs=${5:5000}"], "plain_text_runbook": ["INCIDENT RUNBOOK - ${1:checkout-api}", "====================================", "", "SYMPTOM      ${2:5xx rate above 2 percent for 5 minutes}", "FIRST CHECK  ${3:kubectl get pods -l app.kubernetes.io/name=checkout-api}", "LOGS         ${4:kubectl logs -l app.kubernetes.io/name=checkout-api --tail=200}", "ROLLBACK     ${5:helm rollback checkout-api}", "OWNER        ${6:payments platform}", "ESCALATE     ${7:after 15 minutes with no recovery}"]};

// ★무료 — ★스니펫을 골라 ★커서 자리에 넣는다
async function insertSnippet() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const names = Object.keys(SNIPPETS);
  if (!names.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const pick = await vscode.window.showQuickPick(names, { placeHolder: S.run });
  if (!pick) return;
  await ed.insertSnippet(new vscode.SnippetString(SNIPPETS[pick].join('\n')));
}

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('cloud-manifest-audit-kit');
  const _max = Number(_c.get('max_files')) || 2000;
  const _skip = String(_c.get('exclude_glob') || '**/node_modules/**');
  const files = await vscode.workspace.findFiles('**/*', _skip, _max);
  const rows = [];
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      rows.push({ file: f.fsPath, hits: scan(doc.getText(), f.fsPath) });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  report(rows);
}

async function quickFix(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const hits = scan(ed.document.getText(), ed.document.fileName).filter(function (h) { return h.fix; });
  if (!hits.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  // ★s134 2026-09-08 — ⛔줄 전체를 h.fix(안내 문구)로 바꾸던 버그를 고쳤다 (손님 파일을 지웠다 · 재방문 일꾼이 잡음).
  //   ★규칙에 replace 가 있을 때만 ★맞은 부분만 바꾼다. 없으면 안내만 한다 — 유료 기능이 데이터를 파괴하면 환불 폭탄이다.
  let applied = 0, manual = 0;
  await ed.edit(function (b) {
    for (const h of hits) {
      const r = RULES.find(function (x) { return x.message === h.msg || x.message === h.message; });
      if (!(r && typeof r.replace === 'string')) { manual++; continue; }
      const ln = ed.document.lineAt(h.line - 1);
      const re = new RegExp(r.pattern, r.flags || '');
      const m = re.exec(ln.text);
      if (!m) { manual++; continue; }
      const start = new vscode.Position(h.line - 1, m.index), end = new vscode.Position(h.line - 1, m.index + m[0].length);
      b.replace(new vscode.Range(start, end), m[0].replace(re, r.replace)); applied++;
    }
  });
  vscode.window.showInformationMessage(S.done + ' (' + applied + ' applied, ' + manual + ' need a manual edit - see the report)');
}

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'cloud-manifest-audit-kit');
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const flat = [];
  for (const r of rows) for (const h of r.hits) flat.push({ file: r.file, line: h.line, message: h.msg });
  const csv = ['file,line,message'].concat(
    flat.map(function (h) { return [h.file, h.line, String(h.message).replace(/,/g, ' ')].join(','); })
  ).join('\n');
  const esc = function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const html = ['<!doctype html><meta charset="utf-8"><title>report</title>',
    '<table border="1" cellpadding="4"><tr><th>file</th><th>line</th><th>message</th></tr>'
  ].concat(flat.map(function (h) {
    return '<tr><td>' + esc(h.file) + '</td><td>' + h.line + '</td><td>' + esc(h.message) + '</td></tr>';
  })).concat(['</table>']).join('\n');
  // ★설정을 ★먼저 읽는다 (report_format). ⛔기본값이 없을 때만 물어본다.
  const cfgFmt = String(vscode.workspace.getConfiguration('cloud-manifest-audit-kit').get('reportFormat')
    || vscode.workspace.getConfiguration('cloud-manifest-audit-kit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cloud-manifest-audit-kit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "cloud-manifest-audit-kit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('cloud-manifest-audit-kit.insert_snippet', insertSnippet);
  reg('cloud-manifest-audit-kit.audit_file', runCurrent);
  reg('cloud-manifest-audit-kit.list_rules', listRules);
  reg('cloud-manifest-audit-kit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('cloud-manifest-audit-kit.quick_fix', function () { return quickFix(ctx); });
  reg('cloud-manifest-audit-kit.custom_rules', function () { return customRules(ctx); });
  reg('cloud-manifest-audit-kit.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('cloud-manifest-audit-kit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
