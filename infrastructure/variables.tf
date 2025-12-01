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

variable "monitoring_config" {
  description = "Config for monitoring"
  type = object({
    alerts_enabled = bool
    log_daily_cap  = number
  })
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