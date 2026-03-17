# variables should be sorted A-Z


variable "apps_config" {
  description = "Config for the apps"
  type = object({
    app_service_plan = object({
      sku                      = string
      per_site_scaling_enabled = bool
      worker_count             = number
      zone_balancing_enabled   = bool
    })
    functions_node_version = number

    migration = object({
      buffer_per_worker     = number
      maximum_parallelism   = number
      dispatcher_start_hour = number
      dispatcher_end_hour   = number
    })
  })
}

variable "common_config" {
  description = "Config for the common resources, such as action groups"
  type = object({
    resource_group_name = string
    action_group_names = object({
      iap      = string
      its      = string
      info_sec = string
    })
  })
}

variable "environment" {
  description = "The name of the environment in which resources will be deployed"
  type        = string
}

variable "manage_appeals_config" {
  description = "Config for the manage appeals (back office) system"
  type = object({
    database_server_name     = string
    database_name            = string
    documents_account_name   = string
    documents_container_name = string
    network_name             = string
    resource_group_name      = string
    service_bus_name         = string
  })
}

variable "monitoring_config" {
  description = "Config for monitoring"
  type = object({
    alerts_enabled = bool
    log_daily_cap  = number
  })
}

variable "odw_config" {
  description = "Config for ODW resources - Service Bus integration"
  type = object({
    data_lake_storage_account_id  = string
    data_lake_resource_group_name = string
    network_resource_group_name   = string
    network_name                  = string
    subscription_id               = string
    synapse_ssql_endpoint         = string
    resource_group_name           = string
  })
  default = null
}

variable "sql_config" {
  description = "Config for SQL Server and DB"
  type = object({
    admin = object({
      login_username = string
      object_id      = string
    })
    sku_name    = string
    max_size_gb = number
    retention = object({
      audit_days             = number
      short_term_days        = number
      long_term_weekly       = string
      long_term_monthly      = string
      long_term_yearly       = string
      long_term_week_of_year = number
    })
  })
}

variable "tooling_config" {
  description = "Config for the tooling subscription resources"
  type = object({
    container_registry_name = string
    container_registry_rg   = string
    network_name            = string
    network_rg              = string
    subscription_id         = string
  })
}

variable "vnet_config" {
  description = "VNet configuration"
  type = object({
    address_space             = string
    apps_subnet_address_space = string
    main_subnet_address_space = string
  })
}