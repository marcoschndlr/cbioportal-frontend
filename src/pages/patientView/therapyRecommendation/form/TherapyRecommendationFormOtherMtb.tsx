import * as React from 'react';
import * as _ from 'lodash';
import { Modal, Button } from 'react-bootstrap';
import {
    ITherapyRecommendation,
    EvidenceLevel,
    IGeneticAlteration,
} from 'shared/model/TherapyRecommendation';
import Select from 'react-select';
import { IndicatorQueryResp } from 'oncokb-ts-api-client';
import { getNewTherapyRecommendation } from '../TherapyRecommendationTableUtils';
import { DiscreteCopyNumberData, Mutation } from 'cbioportal-ts-api-client';
import { VariantAnnotation, MyVariantInfo } from 'genome-nexus-ts-api-client';
import AlleleFreqColumnFormatter from 'pages/patientView/mutation/column/AlleleFreqColumnFormatter';

interface ITherapyRecommendationFormOtherMtbProps {
    show: boolean;
    patientID: string;
    fhirsparkResult?: ITherapyRecommendation[];
    title: string;
    userEmailAddress: string;
    mutations: Mutation[];
    cna: DiscreteCopyNumberData[];
    indexedVariantAnnotations:
        | { [genomicLocation: string]: VariantAnnotation }
        | undefined;
    indexedMyVariantInfoAnnotations:
        | { [genomicLocation: string]: MyVariantInfo }
        | undefined;
    onHide: (
        newTherapyRecommendation?:
            | ITherapyRecommendation
            | ITherapyRecommendation[]
    ) => void;
}

export default class TherapyRecommendationFormOtherMtb extends React.Component<
    ITherapyRecommendationFormOtherMtbProps,
    {}
> {
    public render() {
        let selectedTherapyRecommendation: ITherapyRecommendation;
        if (
            this.props.fhirsparkResult == null ||
            this.props.fhirsparkResult.length == 0
        ) {
            return (
                <Modal
                    show={this.props.show}
                    onHide={() => {
                        this.props.onHide(undefined);
                    }}
                    backdrop={'static'}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>{this.props.title}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Did not find any mathing recommendations from other MTB
                        session.
                    </Modal.Body>
                </Modal>
            );
        } else {
            const groupStyles = {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 18,
            };
            const groupBadgeStyles = {
                backgroundColor: '#EBECF0',
                borderRadius: '2em',
                color: '#172B4D',
                display: 'inline-block',
                fontSize: 12,
                lineHeight: '1',
                minWidth: 1,
                padding: '0.16666666666667em 0.5em',
            };
            return (
                <Modal
                    show={this.props.show}
                    onHide={() => {
                        this.props.onHide(undefined);
                    }}
                    backdrop={'static'}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>{this.props.title}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form className="form">
                            <div className="form-group">
                                <h5>Select entry from other MTB:</h5>
                                <Select
                                    options={this.props.fhirsparkResult.map(
                                        result => ({
                                            label:
                                                result.treatments
                                                    .map(t => {
                                                        return t.name;
                                                    })
                                                    .join(' + ') +
                                                ' (' +
                                                result.reasoning.geneticAlterations
                                                    ?.map(g => {
                                                        return (
                                                            g.hugoSymbol +
                                                            ' ' +
                                                            g.alteration
                                                        );
                                                    })
                                                    .join(', ') +
                                                ') - ' +
                                                result.evidenceLevel +
                                                (result.evidenceLevelExtension
                                                    ? ' ' +
                                                      result.evidenceLevelExtension +
                                                      (result.evidenceLevelM3Text
                                                          ? ' ' +
                                                            result.evidenceLevelM3Text
                                                          : '')
                                                    : ''),
                                            value: result,
                                        })
                                    )}
                                    name="oncoKBResult"
                                    className="basic-select"
                                    classNamePrefix="select"
                                    onChange={(selectedOption: {
                                        label: string;
                                        value: {
                                            result: ITherapyRecommendation;
                                            treatmentIndex: number;
                                        };
                                    }) => {
                                        console.log(selectedOption);
                                        selectedTherapyRecommendation =
                                            selectedOption.value.result;
                                    }}
                                    formatGroupLabel={(data: any) => (
                                        <div
                                            style={groupStyles}
                                            // onClick={(e: any) => {
                                            //     e.stopPropagation();
                                            //     e.preventDefault();
                                            //     console.log('Group heading clicked', data);
                                            // }}
                                        >
                                            <span>{data.label}</span>
                                            <span style={groupBadgeStyles}>
                                                {data.options.length}
                                            </span>
                                        </div>
                                    )}
                                />
                            </div>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            type="button"
                            bsStyle="default"
                            onClick={() => {
                                this.props.onHide(undefined);
                            }}
                        >
                            Dismiss
                        </Button>
                        <Button
                            type="button"
                            bsStyle="info"
                            onClick={() => {
                                window.confirm(
                                    'Are you sure you wish to add all entries automatically?'
                                ) &&
                                    this.props.onHide(
                                        this.props.fhirsparkResult
                                    );
                            }}
                        >
                            Add all entries
                        </Button>
                        <Button
                            type="button"
                            bsStyle="primary"
                            onClick={() => {
                                this.props.onHide(
                                    selectedTherapyRecommendation
                                );
                            }}
                        >
                            Add entry
                        </Button>
                    </Modal.Footer>
                </Modal>
            );
        }
    }
}
