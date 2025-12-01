locals {
  org              = "pins"
  service_name     = "appeals-migration"
  primary_location = "uk-south"

  resource_suffix         = "${local.service_name}-${var.environment}"
  shorter_resource_suffix = "appeals-mgr-${var.environment}"

  tags = {
    CreatedBy   = "terraform"
    Environment = var.environment
    ServiceName = local.service_name
    location    = local.primary_location
  }

  tech_emails = [for rec in azurerm_monitor_action_group.appeals_migration_tech.email_receiver : rec.email_address]
  action_group_ids = {
    tech            = azurerm_monitor_action_group.appeals_migration_tech.id
    service_manager = azurerm_monitor_action_group.appeals_migration_service_manager.id
    iap             = data.azurerm_monitor_action_group.common["iap"].id,
    its             = data.azurerm_monitor_action_group.common["its"].id,
    info_sec        = data.azurerm_monitor_action_group.common["info_sec"].id
  }

  key_vault_refs = merge(
    {
      "sql-app-connection-string" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.sql_app_connection_string.versionless_id})"
    }
  )
}
