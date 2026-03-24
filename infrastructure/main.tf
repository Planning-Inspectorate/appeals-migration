resource "azurerm_resource_group" "primary" {
  name     = "${local.org}-rg-${local.resource_suffix}"
  location = module.primary_region.location

  tags = local.tags
}
