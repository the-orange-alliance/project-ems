import { InputNumber, Switch } from "antd";
import SettingsRow from "./settings-row.js";


interface BooleanRowProps {
    title: string;
    value?: boolean;
    defaultValue?: boolean;
    disabled?: boolean;
    onChange?: (newValue: boolean) => void;
}

const BooleanRow: React.FC<BooleanRowProps> = ({ title, defaultValue, disabled, onChange, value}) => {
    return (
        <SettingsRow
            title={title}
            inputComponent={
                <Switch defaultValue={defaultValue}
                    checked={value}
                    disabled={disabled}
                    onChange={(newValue) => {
                        if (onChange) {
                            onChange(newValue);
                        }
                    }}
                />
            }
        />
    );
}

export default BooleanRow;