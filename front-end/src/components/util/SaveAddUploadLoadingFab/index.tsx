import { CircularProgress, SpeedDial, SpeedDialAction, SpeedDialIcon } from "@mui/material"
import { ChangeEvent } from "react"
import { ExpandLess, Upload, Save } from "@mui/icons-material"



interface IProps {
    onSave?: () => void,
    onAdd?: () => void,
    onUpload?: (event: ChangeEvent<HTMLInputElement>) => void,
    loading?: boolean,
    canSave?: boolean,
    canAdd?: boolean,
    canUpload?: boolean,
    uploadTooltip?: string,
    addTooltip?: string,
    saveTooltip?: string,
}

const SaveAddUploadLoadingFab = ({ onSave, onAdd, onUpload, loading, canSave, canAdd, canUpload, uploadTooltip, saveTooltip, addTooltip }: IProps) => {
    return (
        <SpeedDial
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            icon={!loading ? <ExpandLess /> : <CircularProgress color="secondary" />}
            ariaLabel={'add event'}
        >
            {!loading && canAdd && (
                <SpeedDialAction
                    tooltipTitle={addTooltip ?? "Add"}
                    onClick={onAdd}
                    icon={<SpeedDialIcon />}
                />
            )}

            {!loading && canUpload && (
                <SpeedDialAction
                    tooltipTitle={uploadTooltip ?? "Upload"}
                    icon={(<><Upload /><input type="file" hidden onChange={onUpload} /></>)}
                    // @ts-ignore - I don't know why this is complaining
                    FabProps={{ component: "label" }}
                />
            )}

            {!loading && canSave && (
                <SpeedDialAction
                    tooltipTitle={saveTooltip ?? "Save"}
                    onClick={onSave}
                    icon={<Save />}
                />
            )}
        </SpeedDial>
    )
}

export default SaveAddUploadLoadingFab