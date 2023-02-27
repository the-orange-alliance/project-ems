export interface DriverstationStatus {
  teamKey: number,
  allianceStation: number,
  enabled: boolean,
  bypassed: boolean,
  auto: boolean,
  estop: boolean,
  ds_linked: boolean,
  radio_linked: boolean,
  robot_linked: boolean,
  batt_voltage: number,
  robot_trip_time_ms: number,
  missed_packet_count: number,
  sec_since_last_robot_link: number,
  last_packet_time: number,
  last_robot_linked_time: number,
  packet_count: number,
  ip_address: string,
  missed_packet_offset: number
}
