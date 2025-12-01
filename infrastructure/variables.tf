# variables should be sorted A-Z

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
    public_network_access_enabled = bool
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