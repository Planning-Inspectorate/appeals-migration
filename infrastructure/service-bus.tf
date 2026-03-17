data "azurerm_servicebus_namespace" "appeals" {
  name                = var.manage_appeals_config.service_bus_name
  resource_group_name = var.manage_appeals_config.resource_group_name
}

locals {
  queues = [
    "appeals-migration-migrate-data",
    "appeals-migration-list-documents-to-migrate",
    "appeals-migration-migrate-documents",
    "appeals-migration-validate-migrated-cases"
  ]
}

resource "azurerm_servicebus_queue" "queues" {
  for_each = toset(local.queues)

  name         = each.key
  namespace_id = data.azurerm_servicebus_namespace.appeals.id
}

resource "azurerm_role_assignment" "queue_data_owner" {
  for_each = azurerm_servicebus_queue.queues

  scope                = each.value.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = module.function_main.principal_id
}