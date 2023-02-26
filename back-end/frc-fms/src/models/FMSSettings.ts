export default class FMSSettings {
    public enableFms: boolean;
    public enableAdvNet: boolean;
    public apIp: string;
    public apUsername: string;
    public apPassword: string;
    public apTeamCh: string;
    public apAdminCh: string;
    public apAdminWpa: string;
    public switchIp: string;
    public switchPassword: string;
    public enablePlc: boolean;
    public plcIp: string;

    constructor() {
        this.enableFms = true;
        this.enableAdvNet = true;
        this.apIp = "10.0.100.3";
        this.apUsername = "root";
        this.apPassword = "1234Five";
        this.apTeamCh = "157";
        this.apAdminCh = "-1";
        this.apAdminWpa = "1234Five";
        this.switchIp = "10.0.100.2";
        this.switchPassword = "1234Five";
        this.enablePlc = true;
        this.plcIp = "10.0.100.40";
    }
    public fromJson(json: any): this {
        this.enableFms = json.enable_fms;
        this.enableAdvNet = json.enable_adv_net;
        this.apIp = json.ap_ip;
        this.apUsername = json.ap_username;
        this.apPassword = json.ap_password;
        this.apTeamCh = json.ap_team_ch;
        this.apAdminCh = json.ap_admin_ch;
        this.apAdminWpa = json.ap_admin_wpa;
        this.switchIp = json.switch_ip;
        this.switchPassword = json.switch_password;
        this.enablePlc = json.enable_plc;
        this.plcIp = json.plc_ip;
        return this;
    }

    public toJson(): object {
        return {
            enable_fms: this.enableFms,
            enable_adv_net: this.enableAdvNet,
            ap_ip: this.apIp,
            ap_username: this.apUsername,
            ap_password: this.apPassword,
            ap_team_ch: this.apTeamCh,
            ap_admin_ch: this.apAdminCh,
            ap_admin_wpa: this.apAdminWpa,
            switch_ip: this.switchIp,
            switch_password: this.switchPassword,
            enable_plc: this.enablePlc,
            plc_ip: this.plcIp,
        };
    }
}