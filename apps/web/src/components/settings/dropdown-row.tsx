import { Select, Space, Typography } from "antd";
import SettingsRow from "./settings-row.js";
import { useState } from "react";


interface DropdownRowProps {
    title: string;
    value?: any;
    defaultValue?: any;
    options?: { label: string, value: any }[];
    disabled?: boolean;
    multiple?: boolean;
    validator?: (value: any | null) => true | {status: 'error' | 'warning', message: string};
    onChange?: (newValue: any | null) => void;
}

const DropdownRow: React.FC<DropdownRowProps> = ({ title, defaultValue, disabled, onChange, validator, value, options, multiple}) => {

    const [valid, setValid] = useState(true);
    const [validState, setValidState] = useState<'error' | 'warning'>('error');
    const [validMessage, setValidMessage] = useState<string>('');
    
    const handleChange = (newValue: any | null) => {
        if (onChange) {
            onChange(newValue);
        }
        if (validator) {
            const isValid = validator(newValue);
            if (isValid !== true) {
                setValid(false);
                setValidState(isValid.status);
                setValidMessage(isValid.message);
            }
        }
    }

    return (
        <SettingsRow
            title={title}
            inputComponent={
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                        value={value}
                        options={options}
                        defaultValue={defaultValue}
                        disabled={disabled}
                        status={!valid ? validState : undefined}
                        onChange={handleChange}
                        mode={multiple ? 'multiple' : undefined}
                        style={{ width: '100%' }}
                    />
                    {!valid && 
                        <Typography.Text type={validState === 'error' ? 'danger' : 'warning'}> 
                            {validMessage}
                        </Typography.Text>
                    }
                </Space>
            }
        />
    );
}

export default DropdownRow;