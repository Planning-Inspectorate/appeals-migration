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
