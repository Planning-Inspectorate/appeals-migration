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

# Log cap alert using scheduled query rules
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "log_cap" {
  count = var.environment == "prod" ? 1 : 0

  name         = "Log cap Alert"
  display_name = "log Daily data limit reached"
  description  = "Triggered when the log Data cap is reached."

  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  scopes              = [azurerm_log_analytics_workspace.main.id]

  enabled                 = true
  auto_mitigation_enabled = false

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"

  criteria {
    query                   = <<-QUERY
      _LogOperation
      | where Category =~ "Ingestion" | where Detail contains "OverQuota"
      QUERY
    time_aggregation_method = "Count"
    threshold               = 0
    operator                = "GreaterThan"
  }

  severity = 2
  action {
    action_groups = [local.action_group_ids.tech]
  }
}
