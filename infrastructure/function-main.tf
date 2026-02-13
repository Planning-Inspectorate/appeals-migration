module "function_main" {
  #checkov:skip=CKV_TF_1: Use of commit hash are not required for our Terraform modules
  source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/node-function-app?ref=1.53"

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

  # monitoring
  action_group_ids            = local.action_group_ids
  app_insights_instrument_key = azurerm_application_insights.main.instrumentation_key
  log_analytics_workspace_id  = azurerm_log_analytics_workspace.main.id
  monitoring_alerts_enabled   = var.monitoring_config.alerts_enabled

  # settings
  function_node_version = var.apps_config.functions_node_version
  app_settings = {
    SQL_CONNECTION_STRING                   = local.key_vault_refs["sql-app-connection-string"]
    MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME   = "azurerm_storage_account.functions.name"
    MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME = "document-migration-test"
    MANAGE_APPEALS_SQL_CONNECTION_STRING    = "placeholder"
    HORIZON_WEB_BASE_URL                    = local.key_vault_refs["horizon-web-base-url"]
    HORIZON_WEB_USERNAME                    = local.key_vault_refs["horizon-web-username"]
    HORIZON_WEB_PASSWORD                    = local.key_vault_refs["horizon-web-password"]
    HORIZON_WEB_PASSWORD                    = local.key_vault_refs["horizon-web-password"]
    HORIZON_WEB_DNS_MAPPING                 = local.key_vault_refs["horizon-web-dns-mapping"]
    SQL_CONNECTION_STRING                   = "placeholder"
    ODW_CURATED_SQL_CONNECTION_STRING       = "placeholder"
  }
}

## RBAC for secrets
resource "azurerm_role_assignment" "function_main_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.function_main.principal_id
}
