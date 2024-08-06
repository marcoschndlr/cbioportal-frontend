import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ClinicalData } from 'cbioportal-ts-api-client';

import './style.scss';
import Reveal from 'reveal.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/white.css';
import { useHistoryState } from 'shared/lib/hooks/use-history-state';
import { CreateTextIcon } from './icons/CreateTextIcon';
import { AddMutationTableIcon } from 'pages/patientView/presentation/icons/AddMutationTableIcon';
import { ToggleFullscreenIcon } from 'pages/patientView/presentation/icons/ToggleFullscreenIcon';
import { UndoIcon } from 'pages/patientView/presentation/icons/UndoIcon';
import { RedoIcon } from 'pages/patientView/presentation/icons/RedoIcon';
import { deepCopy } from 'pages/patientView/presentation/utils/utils';
import { Node } from './model/node';
import { DndContext, DragEndEvent, useSensor, useSensors } from '@dnd-kit/core';
import { PointerSensor } from 'pages/patientView/presentation/PointerSensor';
import { Draggable } from 'pages/patientView/presentation/Draggable';
import { useHotkeys } from 'react-hotkeys-hook';
import { Menu, MenuItem } from 'pages/patientView/presentation/ContextMenu';

export interface PresentationClinicalData {
    name: string;
    age: string;
    dfsStatus: string;
    ecogStatus: string;
    gender: string;
    karnofskyPerformanceScore: string;
    kasId: string;
    osMonths: string;
    osStatus: string;
    sampleCount: string;
    cancerType: string;
}

interface PresentationProps {
    clinicalData: ClinicalData[];
    patientViewPageStore: any;
    dataStore: any;
    sampleManager: any;
    sampleIds: string[];
    mergeOncoKbIcons: boolean;
    onOncoKbIconToggle: (mergeIcons: boolean) => void;
    columnVisibility: { [columnId: string]: boolean } | undefined;
    onFilterGenes: (option: any) => void;
    columnVisibilityProps: any;
    onSelectGenePanel: (name: string) => void;
    disableTooltip: boolean;
    onRowClick: (d: any[]) => void;
    onRowMouseEnter: (d: any[]) => void;
    onRowMouseLeave: (d: any[]) => void;
    namespaceColumns: any;
    columns: string[];
    pageMode: 'sample' | 'patient';
    alleleFreqHeaderRender: ((name: string) => JSX.Element) | undefined;
}

export const Presentation: React.FunctionComponent<PresentationProps> = observer(
    ({ clinicalData, ...mutationTableProps }: PresentationProps) => {
        const deckDivRef = useRef<HTMLDivElement>(null); // reference to deck container div
        const deckRef = useRef<Reveal.Api | null>(null); // reference to deck reveal instance

        const pointerSensor = useSensor(PointerSensor);
        const sensors = useSensors(pointerSensor);

        const [idCounter, setIdCounter] = useState(2);
        const [slideIdCounter, setSlideIdCounter] = React.useState(0);
        const [currentSlideId, setCurrentSlideId] = useState('');

        const { state, set, undo, redo, canRedo, canUndo } = useHistoryState<
            (Node<string> | Node<null>)[]
        >({
            slideId: crypto.randomUUID(),
            initialPresent: [
                {
                    id: '1',
                    position: { left: 380, top: 250 },
                    type: 'text',
                    value: `${findClinicalAttributeOrEmptyString(
                        'PATIENT_DISPLAY_NAME'
                    )}<br>${findClinicalAttributeOrEmptyString(
                        'AGE'
                    )} years old`,
                },
            ],
        });

        const [selectedNodes, setSelectedNodes] = useState<
            { slideId: string; nodeId: string }[]
        >([]);

        useHotkeys('ctrl+v,meta+v', () => handlePaste(), [
            state,
            currentSlideId,
        ]);

        useHotkeys('ctrl+c,meta+c', () => handleCopy(), [
            state,
            currentSlideId,
            selectedNodes,
        ]);

        useHotkeys('ctrl+z,meta+z', () => onUndoClick(), [
            undo,
            currentSlideId,
        ]);
        useHotkeys('ctrl+shift+z,meta+shift+z', () => onRedoClick(), [
            redo,
            currentSlideId,
        ]);

        useHotkeys('backspace', () => onBackspacePressed(), [selectedNodes]);

        useEffect(() => {
            // Prevents double initialization in strict mode
            if (deckRef.current) return;

            deckRef.current = new Reveal(deckDivRef.current!, {
                transition: 'slide',
                controls: false,
                progress: false,
                embedded: true,
                center: false,
            });

            deckRef.current.initialize().then(reveal => {
                setCurrentSlideId(deckRef.current?.getCurrentSlide()?.id ?? '');
                deckRef.current?.on('slidechanged', (e: any) =>
                    setCurrentSlideId(e.currentSlide.id)
                );
            });

            return () => {
                try {
                    if (deckRef.current) {
                        deckRef.current.destroy();
                        deckRef.current = null;
                    }
                } catch (e) {
                    console.warn('Reveal.js destroy call failed.');
                }
            };
        }, []);

        async function handlePaste() {
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const clipboardItem of clipboardItems) {
                    for (const type of clipboardItem.types) {
                        const asImage = clipboardItem.types.find(type =>
                            type.startsWith('image/')
                        );
                        if (asImage) {
                            const blob = await clipboardItem.getType(asImage);
                            await handlePasteAsImage(blob);
                            return;
                        }

                        const asHTML = clipboardItem.types.find(
                            type => type === 'text/html'
                        );
                        if (asHTML) {
                            const blob = await clipboardItem.getType(asHTML);
                            await handlePasteAsHTML(blob);
                            return;
                        }

                        const asText = clipboardItem.types.find(
                            type => type === 'text/plain'
                        );
                        if (asText) {
                            const blob = await clipboardItem.getType(asText);
                            await handlePasteAsText(blob);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error(err.name, err.message);
            }
        }

        async function handlePasteAsHTML(blob: Blob) {
            const html = await blob.text();
            createHTML(html);
        }

        async function handlePasteAsImage(blob: Blob) {
            createImage(blob);
        }

        async function handlePasteAsText(blob: Blob) {
            const text = await blob.text();
            createText(text);
        }

        function noNodesSelected() {
            return selectedNodes.length < 1;
        }

        async function handleCopy() {
            if (noNodesSelected()) return;

            const selectedNode = selectedNodes[0];
            const present = state.get(selectedNode.slideId)?.present;
            const presentOfSelectedNode = present?.find(
                node => node.id === selectedNode.nodeId
            );

            if (presentOfSelectedNode) {
                const type = presentOfSelectedNode.type;

                switch (type) {
                    case 'text':
                        await copyAsText(presentOfSelectedNode.value);
                        break;
                    case 'image':
                        await copyAsImage(presentOfSelectedNode.value);
                        break;
                    case 'html':
                        await copyAsHTML(presentOfSelectedNode.value);
                        break;
                }
            }
        }

        async function copyAsText(value: string | null) {
            if (!value) return;

            try {
                await navigator.clipboard.writeText(value);
            } catch (err) {
                console.error(err.name, err.message);
            }
        }

        async function copyAsImage(value: string | null) {
            if (!value) return;

            try {
                const blob = await fetch(value).then(response =>
                    response.blob()
                );
                const clipboardItem = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([clipboardItem]);
            } catch (err) {
                console.error(err.name, err.message);
            }
        }

        async function copyAsHTML(value: string | null) {
            if (!value) return;

            try {
                const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([value], { type: 'text/html' }),
                });
                await navigator.clipboard.write([clipboardItem]);
            } catch (err) {
                console.error(err.name, err.message);
            }
        }

        function onBackspacePressed() {
            if (noNodesSelected()) return;

            const selectedNode = selectedNodes[0];
            const present = state.get(selectedNode.slideId)?.present;
            if (present) {
                const presentWithoutSelected = present.filter(
                    node => node.id !== selectedNode.nodeId
                );
                set(selectedNode.slideId, presentWithoutSelected);
                onSelectedChanged(
                    selectedNode.slideId,
                    selectedNode.nodeId,
                    false
                );
            }
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                const fullscreenElement = document.querySelector(
                    '.presentation'
                );

                fullscreenElement!.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        function findClinicalAttributeOrEmptyString(
            attributeId: string
        ): string {
            const attribute = clinicalData.find(
                cd => cd.clinicalAttributeId === attributeId
            );
            return attribute ? attribute.value : '';
        }

        function getAndIncrementCounter() {
            const counter = idCounter;
            setIdCounter(counter => counter + 1);
            return `${counter}`;
        }

        function getCurrentSlideId() {
            return currentSlideId;
        }

        function onUndoClick() {
            const slideId = getCurrentSlideId();

            if (slideId) {
                undo(slideId);
            }
        }

        function onRedoClick() {
            const slideId = getCurrentSlideId();

            if (slideId) {
                redo(slideId);
            }
        }

        function onAddSlideClick() {
            set(crypto.randomUUID(), []);
        }

        function createText(value?: string) {
            const id = getAndIncrementCounter();

            const node: Node<string> = {
                id,
                position: { left: 20 * Number(id), top: 20 * Number(id) },
                type: 'text',
                value: value ?? 'Neuer Textbaustein',
            };

            const present = state.get(getCurrentSlideId())?.present ?? [];
            set(getCurrentSlideId(), [...present, node]);
        }

        function createImage(blob: Blob) {
            const id = getAndIncrementCounter();

            const node: Node<string> = {
                id,
                position: { left: 20 * Number(id), top: 20 * Number(id) },
                type: 'image',
                value: URL.createObjectURL(blob),
            };

            const present = state.get(getCurrentSlideId())?.present ?? [];
            set(getCurrentSlideId(), [...present, node]);
        }

        function addMutationTable() {
            const id = getAndIncrementCounter();

            const node: Node<null> = {
                id,
                position: { left: 20 * Number(id), top: 20 * Number(id) },
                type: 'mutationTable',
                value: null,
            };

            const present = state.get(getCurrentSlideId())?.present ?? [];
            set(getCurrentSlideId(), [...present, node]);
        }

        function createHTML(html: string) {
            const id = getAndIncrementCounter();

            const node: Node<string> = {
                id,
                position: { left: 20 * Number(id), top: 20 * Number(id) },
                type: 'html',
                value: html,
            };

            const present = state.get(getCurrentSlideId())?.present ?? [];
            set(getCurrentSlideId(), [...present, node]);
        }

        function mapClinicalData(): PresentationClinicalData {
            const name = findClinicalAttributeOrEmptyString(
                'PATIENT_DISPLAY_NAME'
            );
            const age = findClinicalAttributeOrEmptyString('AGE');
            const dfsStatus = findClinicalAttributeOrEmptyString('DFS_STATUS');
            const ecogStatus = findClinicalAttributeOrEmptyString(
                'ECOG _STATUS'
            );
            const gender = findClinicalAttributeOrEmptyString('GENDER');
            const karnofskyPerformanceScore = findClinicalAttributeOrEmptyString(
                'KARNOFSKY_PERFORMANCE_SCORE'
            );
            const kasId = findClinicalAttributeOrEmptyString('KAS_ID');
            const osMonths = findClinicalAttributeOrEmptyString('OS_MONTHS');
            const osStatus = findClinicalAttributeOrEmptyString('OS_STATUS');
            const sampleCount = findClinicalAttributeOrEmptyString(
                'SAMPLE_COUNT'
            );
            const cancerType = findClinicalAttributeOrEmptyString('TEST');

            return {
                name,
                age,
                dfsStatus,
                ecogStatus,
                gender,
                karnofskyPerformanceScore,
                kasId,
                osMonths,
                osStatus,
                sampleCount,
                cancerType,
            };
        }

        function onDragEnd(event: DragEndEvent) {
            if (
                !event.active.data.current ||
                (Math.abs(event.delta.x) < 1 && Math.abs(event.delta.y) < 1)
            )
                return;

            const slideId = event.active.data.current.slideId;
            const present = state.get(slideId)?.present;

            if (!present) return;

            const copiedPresent = deepCopy(present);

            const nextPresent = copiedPresent.map(node => {
                if (node.id === event.active.id) {
                    node.position.left += event.delta.x;
                    node.position.top += event.delta.y;
                    return node;
                } else {
                    return node;
                }
            });

            set(slideId, nextPresent);
        }

        function onStateChanged(slideId: string, id: string, value: any) {
            const present = state.get(slideId)?.present;

            if (!present) return;

            const copiedPresent = deepCopy(present);

            let modified = false;

            const nextPresent = copiedPresent.map(node => {
                if (node.id === id && node.value !== value) {
                    node.value = value;
                    modified = true;
                    return node;
                } else {
                    return node;
                }
            });

            if (modified) {
                set(slideId, nextPresent);
            }
        }

        function onSelectedChanged(
            slideId: string,
            id: string,
            selected: boolean
        ) {
            if (selected) {
                setSelectedNodes(current => [
                    ...current,
                    { slideId, nodeId: id },
                ]);
            } else {
                setSelectedNodes(current => {
                    return current.filter(
                        ({ slideId: currentSlideId, nodeId: currentNodeId }) =>
                            currentNodeId !== id
                    );
                });
            }
        }

        return (
            <div className="overview-presentation-container">
                {/*<div className="overview">*/}
                {/*    {Array.from({length: deckRef.current?.getTotalSlides() ?? 0}, (v, i) => i).map((number) => {*/}
                {/*        return `Slide ${number + 1}`*/}
                {/*    })}*/}
                {/*</div>*/}
                <div className="presentation-container">
                    <div className="toolbar">
                        <div onClick={() => createText()}>
                            <CreateTextIcon></CreateTextIcon>
                        </div>
                        <div onClick={addMutationTable}>
                            <AddMutationTableIcon></AddMutationTableIcon>
                        </div>
                        <div
                            onClick={onUndoClick}
                            className={
                                canUndo(getCurrentSlideId()) ? '' : 'disabled'
                            }
                        >
                            <UndoIcon></UndoIcon>
                        </div>
                        <div
                            onClick={onRedoClick}
                            className={
                                canRedo(getCurrentSlideId()) ? '' : 'disabled'
                            }
                        >
                            <RedoIcon></RedoIcon>
                        </div>
                        <div onClick={onAddSlideClick}>Add Slide</div>
                        <div
                            className="toolbar__fullscreen"
                            onClick={toggleFullscreen}
                        >
                            <ToggleFullscreenIcon></ToggleFullscreenIcon>
                        </div>
                    </div>
                    <div className="presentation">
                        <Menu ref={deckDivRef}>
                            <MenuItem label="Paste" onClick={handlePaste} />
                        </Menu>
                        <div className="reveal" ref={deckDivRef}>
                            <div className="slides">
                                {Array.from(state.entries()).map(
                                    ([slideId, timeState]) => (
                                        <section id={slideId} key={slideId}>
                                            <DndContext
                                                sensors={sensors}
                                                onDragEnd={onDragEnd}
                                            >
                                                {timeState.present &&
                                                    timeState.present.map(
                                                        node =>
                                                            React.createElement(
                                                                Draggable,
                                                                {
                                                                    slideId,
                                                                    id: node.id,
                                                                    top:
                                                                        node
                                                                            .position
                                                                            .top,
                                                                    left:
                                                                        node
                                                                            .position
                                                                            .left,
                                                                    width:
                                                                        node.type ===
                                                                        'image'
                                                                            ? 200
                                                                            : 'auto',
                                                                    resizable:
                                                                        node.type ===
                                                                        'image',
                                                                    key:
                                                                        node.id,
                                                                    selectedChanged: (
                                                                        selected: boolean
                                                                    ) =>
                                                                        onSelectedChanged(
                                                                            slideId,
                                                                            node.id,
                                                                            selected
                                                                        ),
                                                                    component: {
                                                                        type:
                                                                            node.type,
                                                                        props: {
                                                                            ...(node.type ===
                                                                                'mutationTable' && {
                                                                                ...mutationTableProps,
                                                                            }),
                                                                            initialValue:
                                                                                node.value,
                                                                            selectedChanged: (
                                                                                selected: boolean
                                                                            ) =>
                                                                                onSelectedChanged(
                                                                                    slideId,
                                                                                    node.id,
                                                                                    selected
                                                                                ),
                                                                            stateChanged: (
                                                                                value: any
                                                                            ) =>
                                                                                onStateChanged(
                                                                                    slideId,
                                                                                    node.id,
                                                                                    value
                                                                                ),
                                                                        },
                                                                    },
                                                                }
                                                            )
                                                    )}
                                            </DndContext>
                                        </section>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);
