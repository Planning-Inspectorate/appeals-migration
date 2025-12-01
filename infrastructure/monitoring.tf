resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.org}-log-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = var.monitoring_config.log_daily_cap

  tags = local.tags
}

resource "azurerm_application_insights" "main" {
  name                 = "${local.org}-ai-${local.resource_suffix}"
  location             = module.primary_region.location
  resource_group_name  = azurerm_resource_group.primary.name
  workspace_id         = azurerm_log_analytics_workspace.main.id
  application_type     = "web"
  daily_data_cap_in_gb = 0.1

  tags = local.tags
}

resource "azurerm_monitor_action_group" "appeals_migration_tech" {
  name                = "pins-ag-appeals-migration-tech-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  short_name          = "AppealsMigr" # needs to be under 12 characters
  tags                = local.tags

  # we set emails in the action groups in Azure Portal - to avoid needing to manage emails in terraform
  lifecycle {
    ignore_changes = [
      email_receiver
    ]
  }
}

resource "azurerm_monitor_action_group" "appeals_migration_service_manager" {
  name                = "pins-ag-appeals-migration-service-manager-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  short_name          = "AppealsMigr" # needs to be under 12 characters
  tags                = local.tags

  # we set emails in the action groups in Azure Portal - to avoid needing to manage emails in terraform
  lifecycle {
    ignore_changes = [
      email_receiver
    ]
  }
}
