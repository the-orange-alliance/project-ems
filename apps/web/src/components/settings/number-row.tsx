import { InputNumber } from "antd";
import SettingsRow from "./settings-row.js";


interface NumberRowProps {
    title: string;
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onChange?: (newValue: number | null) => void;
}

const NumberRow: React.FC<NumberRowProps> = ({ title, defaultValue, disabled, max, min, onChange, step, value}) => {
    return (
        <SettingsRow
            title={title}
            inputComponent={
                <InputNumber value={value}
                    defaultValue={defaultValue}
                    min={min}
                    max={max}
                    step={step}
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

export default NumberRow;