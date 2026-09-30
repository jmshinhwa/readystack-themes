# OpenSearch Migration Check — Elasticsearch & Kibana cutover lint

![OpenSearch Migration Check: Elasticsearch & Kibana cutover lint](https://getreadystack.com/img/promo/sku391117_result_card.jpg)

Open a `docker-compose.yml`, `elasticsearch.yml`, `kibana.yml`, Logstash pipeline, `requirements.txt`, `package.json`, `pom.xml`, `go.mod`, `Gemfile`, Helm values or an index mapping. Every line that will break a move from Elasticsearch / Kibana to OpenSearch / OpenSearch Dashboards is underlined in the Problems panel, with the OpenSearch replacement next to it.

Tool page and free web version: https://getreadystack.com/tools/opensearch-migration-check

Yardstick: Elastic Cloud Hosted Standard starts at $99 per month (elastic.co/pricing/cloud-hosted); this check runs locally and sends nothing anywhere.

## Why these lines break

- Elastic moved Elasticsearch and Kibana from Apache-2.0 to SSPL / Elastic License 2.0 with 7.11. OpenSearch forked from 7.10.2 and stays Apache-2.0.
- Elasticsearch 7.17 reached end of support on 2026-01-15. Teams still on 7.x choose between an Elastic-licensed 8.x/9.x upgrade and OpenSearch.
- OpenSearch refuses to start when it meets a setting it does not know, so one leftover `xpack.*` line stops the node at boot.
- Elastic clients from 7.14 on check the server product. elasticsearch-py raises `UnsupportedProductError` against OpenSearch, and the Node, Java, Go and Ruby clients do the same check.
- From OpenSearch 2.12 on, the security demo setup needs `OPENSEARCH_INITIAL_ADMIN_PASSWORD`; `ELASTIC_PASSWORD` does nothing.

## What it checks (25 rules)

| Area | Examples of flagged lines | OpenSearch replacement |
|---|---|---|
| Images | `docker.elastic.co/elasticsearch/elasticsearch:8.15.0`, Kibana, Beats, Logstash, `helm.elastic.co` | `opensearchproject/opensearch:2`, `opensearch-dashboards:2`, Fluent Bit / Data Prepper |
| Settings | `xpack.security.*`, `xpack.ml.*`, `ELASTIC_PASSWORD`, `ELASTICSEARCH_HOSTS`, `cluster.initial_master_nodes` | `plugins.security.*`, `OPENSEARCH_INITIAL_ADMIN_PASSWORD`, `OPENSEARCH_HOSTS`, `cluster_manager` |
| Clients | `elasticsearch==8.x`, `@elastic/elasticsearch`, `co.elastic.clients`, `go-elasticsearch`, `gem 'elasticsearch'`, Cloud ID | `opensearch-py`, `@opensearch-project/opensearch`, `opensearch-java`, `opensearch-go`, `opensearch-ruby` |
| Pipelines | Logstash `elasticsearch { }` output, `setup.ilm.*`, `/_ilm/` | `opensearch { }` output, ISM policies |
| Mappings & APIs | `dense_vector`, `flattened`, `semantic_text`, `sparse_vector`, ES\|QL `/_query`, `/_security/api_key`, `/_xpack`, ECK `k8s.elastic.co` CRDs | `knn_vector`, `flat_object`, neural-search, PPL / SQL, security plugin API, OpenSearch operator |

Each finding has a line number, a severity (error = the cutover fails, warn = works today but needs rework) and the fix.

## Worked example

A sample `docker-compose.yml` with Elasticsearch 8.15.0, Kibana 8.15.0 and Filebeat 8.15.0 gives 6 findings: the Elasticsearch image, `xpack.security.enabled=true`, `ELASTIC_PASSWORD`, the Kibana image, `ELASTICSEARCH_HOSTS` and the Filebeat image. The same stack rewritten for OpenSearch 2.17.0 gives 0.

For a `7.x` image the finding also says how long that version has been out of Elastic support, counted from the date you run it.

## Commands

Open the Command Palette and type "OpenSearch Migration Check", or just save a matching file: findings appear in the Problems panel.

## Free and full version

The free version checks the open file completely, every rule, no limits. The full version ([get it here](https://getreadystack.com/api/buy/cl/polar_cl_SfGssVKywn94tRL3JwJOi6FlwhCvHAxRfTviy2i3VXP)) scans the whole repository in one pass and exports one Markdown migration checklist per file for the change ticket.

## Privacy

Nothing leaves your machine. The web version at the tool page runs the same engine in your browser.
