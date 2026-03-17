module "function_main" {
  #checkov:skip=CKV_TF_1: Use of commit hash are not required for our Terraform modules
  source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/node-function-app?ref=1.54"

  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location

  # naming
  app_name        = "main"
  resource_suffix = var.environment
  service_name    = local.service_name
  tags            = local.tags

  # service plan
  app_service_plan_id = azurerm_service_plan.apps.id

  # storage
  function_apps_storage_account            = azurerm_storage_account.functions.name
  function_apps_storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  # networking
  integration_subnet_id      = azurerm_subnet.apps.id
  outbound_vnet_connectivity = true
  inbound_vnet_connectivity  = true
  private_endpoint = {
    private_dns_zone_id = data.azurerm_private_dns_zone.app_service.id
    subnet_id           = azurerm_subnet.main.id
  }

  # monitoring
  action_group_ids            = local.action_group_ids
  app_insights_instrument_key = azurerm_application_insights.main.instrumentation_key
  log_analytics_workspace_id  = azurerm_log_analytics_workspace.main.id
  monitoring_alerts_enabled   = var.monitoring_config.alerts_enabled

  # settings
  function_node_version = var.apps_config.functions_node_version
  app_settings = {
    SERVICE_BUS_CONNECTION_STRING = "${var.manage_appeals_config.service_bus_name}.servicebus.windows.net"
    SQL_CONNECTION_STRING         = local.key_vault_refs["sql-app-connection-string"]

    BUFFER_PER_WORKER     = var.apps_config.migration.buffer_per_worker
    MAXIMUM_PARALLELISM   = var.apps_config.migration.maximum_parallelism
    DISPATCHER_END_HOUR   = var.apps_config.migration.dispatcher_start_hour
    DISPATCHER_START_HOUR = var.apps_config.migration.dispatcher_end_hour

    HORIZON_WEB_BASE_URL    = local.key_vault_refs["horizon-web-base-url"]
    HORIZON_WEB_USERNAME    = local.key_vault_refs["horizon-web-username"]
    HORIZON_WEB_PASSWORD    = local.key_vault_refs["horizon-web-password"]
    HORIZON_WEB_DNS_MAPPING = local.key_vault_refs["horizon-web-dns-mapping"]

    MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME   = var.manage_appeals_config.documents_account_name
    MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME = var.manage_appeals_config.documents_container_name
    MANAGE_APPEALS_SQL_CONNECTION_STRING    = ""
    ODW_CURATED_SQL_CONNECTION_STRING       = ""
  }
}

## RBAC for secrets
resource "azurerm_role_assignment" "function_main_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.function_main.principal_id
}
