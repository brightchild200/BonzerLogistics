import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    FlatList,
} from "react-native";
import { searchModalStyles as styles } from "./SearchModal.styles";
import { X } from "lucide-react-native";
import { COLORS } from "@/lib/types";
import { Plus } from "lucide-react-native";

type SearchModalProps<T> = {
    visible: boolean;
    title: string;
    search: string;
    setSearch: (text: string) => void;
    data: T[];
    keyExtractor: (item: T) => string;
    labelExtractor: (item: T) => string;
    subtitleExtractor?: (item: T) => string | undefined;

    onSelect: (item: T) => void;
    onClose: () => void;

    showAddButton?: boolean;
    addButtonText?: string;
    onAddNew?: () => void;
};

export default function SearchModal<T>({
    visible,
    title,
    search,
    setSearch,
    data,
    keyExtractor,
    labelExtractor,
    subtitleExtractor,
    onSelect,
    onClose,
    showAddButton = false,
    addButtonText,
    onAddNew,
}: SearchModalProps<T>) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>

                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={onClose}
                        >
                            <X size={18} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.modalSearchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search..."
                        autoFocus
                    />

                    {showAddButton && (
                        <TouchableOpacity
                            style={styles.addNewBtn}
                            onPress={onAddNew}
                        >
                            <Plus size={16} color={COLORS.primary} />

                            <Text style={styles.addNewBtnText}>
                                {addButtonText}
                            </Text>
                        </TouchableOpacity>
                    )}


                    <FlatList
                        data={data}
                        keyExtractor={keyExtractor}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.customerOption}
                                onPress={() => onSelect(item)}
                            >
                                <View>
                                    <Text style={styles.customerOptionText}>
                                        {labelExtractor(item)}
                                    </Text>

                                    {subtitleExtractor && (
                                        <Text style={styles.customerOptionSubText}>
                                            {subtitleExtractor(item)}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />

                </View>
            </View>
        </Modal>
    );
}