import React from 'react';
import styles from './style/clinicalTrialMatch.module.scss';
import ClinicalTrialMatchMutationSelect from './ClinicalTrialMatchSelectUtil';
import ClinicalTrialMatchRecruitingSelect from './ClinicalTrialMatchRecruitingSelect';
import { PatientViewPageStore } from '../clinicalInformation/PatientViewPageStore';
import { RecruitingStatus } from 'shared/enums/ClinicalTrialsGovRecruitingStatus';
import Select from 'react-select';
import { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import {
    recruitingValueNames,
    countriesNames,
    genderNames,
} from './utils/SelectValues';
import { CITIES_AND_COORDINATES } from './utils/location/CoordinateList';
import { Collapse } from 'react-collapse';
import { Modal } from 'react-bootstrap';
import {
    DefaultTooltip,
    placeArrowBottomLeft,
} from 'cbioportal-frontend-commons';

const OPTIONAL_MUTATIONS_TOOLTIP: string =
    'Studies must contain at least one of the search terms. This represents a logical OR.';
const NECESSARY_MUTATIONS_TOOLTIP: string =
    'Studies must contain ALL search terms. This represents a logical AND.';
const STATUS_TOOLTIP: string =
    'Indicates the current recruitment status. Studies not in one of the selected status are not found.';
const COUNTRIES_TOOLTIP: string =
    'In the search feature, the Countries field is used to find clinical studies with locations in specific countries. Only studies recruiting in at least one selected country are found.';
const AGE_TOOLTIP: string =
    'Enter or edit the age of the patient. Studies with matching age groups are ranked higher.';
const SEX_TOOLTIP: string =
    "Select sex of the patient. Studies with matching sex are ranked higher. This is a type of eligibility criteria that indicates the sex of people who may participate in a clinical study (all, female, male).\n Sex is a person's classification as female or male based on biological distinctions. Sex is distinct from gender-based eligibility.";
const LOCATION_TOOLTIP: string =
    'Select exact location of patient. Studies with closer recruiting sites are ranked higher. This function decreases search speed.';
const MAX_DISTANCE_TOOLTIP: string =
    'Select the maximum distance from patient to closest recruiting site.';
const ENTITY_TOOLTIP: string = 'Select Tumor Enitities';

const customComponents = {
    DropdownIndicator: null,
};

interface IClinicalTrialOptionsMatchProps {
    store: PatientViewPageStore;
    show: boolean;
    onHide: () => void;
}

interface IClinicalTrialOptionsMatchState {
    mutationSymbolItems: Array<string>;
    mutationNecSymbolItems: Array<string>;
    tumorEntityItems: Array<string>;
    countryItems: Array<string>;
    recruitingItems: Array<string>;
    gender: string;
    patientLocation: string;
    ageState: number;
    maxDistance: string;
    isOpened: boolean;
    isCollapsed: boolean;
}

class ClinicalTrialMatchTableOptions extends React.Component<
    IClinicalTrialOptionsMatchProps,
    IClinicalTrialOptionsMatchState
> {
    recruiting_values: RecruitingStatus[] = [];
    countries: Array<String>;
    genders: Array<String>;
    locationsWithCoordinates: Array<String>;
    gender: any;
    age: string;
    ageDefault: any;
    tumorEntityDefault: string[];

    constructor(props: IClinicalTrialOptionsMatchProps) {
        super(props);

        this.gender = { label: 'All', value: 'All' };
        let sex = this.props.store.clinicalDataPatient.result.find(
            attribute => attribute.clinicalAttributeId === 'SEX'
        )?.value;
        if (sex !== undefined && sex.length > 0) {
            this.gender = { label: sex, value: sex };
        }

        this.age =
            this.props.store.clinicalDataPatient.result.find(
                attribute => attribute.clinicalAttributeId === 'AGE'
            )?.value || '0';
        this.ageDefault =
            this.age != '0' ? [{ label: this.age, value: this.age }] : null;

        this.tumorEntityDefault = this.props.store.getTumorEntitiesFromPatientSamples.result;

        console.log(this.tumorEntityDefault);

        this.state = {
            mutationSymbolItems: new Array<string>(),
            mutationNecSymbolItems: new Array<string>(),
            tumorEntityItems: new Array<string>(),
            countryItems: new Array<string>(),
            recruitingItems: ['Recruiting', 'Not yet recruiting'],
            patientLocation: '',
            gender: sex || 'All',
            ageState: +parseInt(this.age),
            maxDistance: '',
            isOpened: false,
            isCollapsed: false,
        };

        this.recruiting_values = recruitingValueNames;

        this.genders = genderNames;
        this.countries = countriesNames;
        this.locationsWithCoordinates = Object.keys(CITIES_AND_COORDINATES);
    }

    getRecruitingKeyFromValueString(value: string): RecruitingStatus {
        for (let status of this.recruiting_values) {
            if (status.toString() == value) {
                return status;
            }
        }

        return RecruitingStatus.Invalid;
    }

    setSearchParams() {
        var symbols: string[] = this.state.mutationSymbolItems;
        var necSymbols: string[] = this.state.mutationNecSymbolItems;
        var recruiting_stati: RecruitingStatus[] = this.state.recruitingItems.map(
            item => this.getRecruitingKeyFromValueString(item)
        );
        var countries_to_search: string[] = this.state.countryItems;
        var gender: string = this.state.gender;
        var patientLocation = this.state.patientLocation;
        var patientAge = this.state.ageState;
        var filterDistance = this.state.isOpened;
        var maximumDistance = +this.state.maxDistance;

        console.group('TRIALS start search');
        console.log(this.state);
        console.groupEnd();

        this.props.store.setClinicalTrialSearchParams(
            countries_to_search,
            recruiting_stati,
            symbols,
            necSymbols,
            gender,
            patientLocation,
            patientAge,
            filterDistance,
            maximumDistance
        );

        console.log('smybols');
        console.log(symbols);
        console.log(recruiting_stati);
        console.log('necSymbols');
        console.log(necSymbols);
        console.log('dist');
    }

    render() {
        return (
            <Modal
                show={this.props.show}
                onHide={() => {
                    this.props.onHide();
                }}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Set search parameters</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <React.Fragment>
                        <div
                            style={{
                                display: 'block',
                                width: '95%',
                                minWidth: '450px',
                            }}
                        >
                            <tr>
                                <td width={'50%'}>
                                    <div className={styles.tooltipSpan}>
                                        <span className={styles.header5}>
                                            Required Mutations:
                                        </span>
                                        <DefaultTooltip
                                            overlay={
                                                NECESSARY_MUTATIONS_TOOLTIP
                                            }
                                            trigger={['hover', 'focus']}
                                            destroyTooltipOnHide={true}
                                        >
                                            <i
                                                className={
                                                    'fa fa-info-circle ' +
                                                    styles.icon
                                                }
                                            ></i>
                                        </DefaultTooltip>
                                    </div>
                                    <tr
                                        style={{
                                            display: 'block',
                                            marginLeft: '5px',
                                            marginBottom: '5px',
                                        }}
                                    >
                                        <ClinicalTrialMatchMutationSelect
                                            options={this.props.store.mutationHugoGeneSymbols.map(
                                                geneSymbol => ({
                                                    label: geneSymbol,
                                                    value: geneSymbol,
                                                })
                                            )}
                                            isMulti
                                            data={
                                                this.state
                                                    .mutationNecSymbolItems
                                            }
                                            name="mutationSearch"
                                            className="basic-multi-select"
                                            classNamePrefix="select"
                                            placeholder="Mutationselect..."
                                            onChange={(
                                                selectedOption: string[]
                                            ) => {
                                                const newMutations = [];
                                                if (selectedOption !== null) {
                                                    const mutations = selectedOption;
                                                    newMutations.push(
                                                        ...mutations
                                                    );
                                                }
                                                this.setState({
                                                    mutationNecSymbolItems: newMutations,
                                                });
                                            }}
                                        />
                                    </tr>
                                </td>
                                <td width={'50%'}>
                                    <div className={styles.tooltipSpan}>
                                        <span className={styles.header5}>
                                            Optional Mutations:
                                        </span>
                                        <DefaultTooltip
                                            overlay={OPTIONAL_MUTATIONS_TOOLTIP}
                                            trigger={['hover', 'focus']}
                                            destroyTooltipOnHide={true}
                                        >
                                            <i
                                                className={
                                                    'fa fa-info-circle ' +
                                                    styles.icon
                                                }
                                            ></i>
                                        </DefaultTooltip>
                                    </div>
                                    <tr
                                        style={{
                                            display: 'block',
                                            marginLeft: '5px',
                                            marginBottom: '5px',
                                        }}
                                    >
                                        <ClinicalTrialMatchMutationSelect
                                            options={this.props.store.mutationHugoGeneSymbols.map(
                                                geneSymbol => ({
                                                    label: geneSymbol,
                                                    value: geneSymbol,
                                                })
                                            )}
                                            isMulti
                                            data={
                                                this.state.mutationSymbolItems
                                            }
                                            name="mutationSearch"
                                            className="basic-multi-select"
                                            classNamePrefix="select"
                                            placeholder="Mutationselect..."
                                            onChange={(
                                                selectedOption: string[]
                                            ) => {
                                                const newMutations = [];
                                                if (selectedOption !== null) {
                                                    const mutations = selectedOption;
                                                    newMutations.push(
                                                        ...mutations
                                                    );
                                                }
                                                this.setState({
                                                    mutationSymbolItems: newMutations,
                                                });

                                                console.group(
                                                    'TRIALS Mutation Changed'
                                                );
                                                console.log(
                                                    this.state
                                                        .mutationSymbolItems
                                                );
                                                console.groupEnd();
                                            }}
                                        />
                                    </tr>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2}>
                                    <div className={styles.tooltipSpan}>
                                        <span className={styles.header5}>
                                            Tumor Entities:
                                        </span>
                                        <DefaultTooltip
                                            overlay={ENTITY_TOOLTIP}
                                            trigger={['hover', 'focus']}
                                            destroyTooltipOnHide={true}
                                        >
                                            <i
                                                className={
                                                    'fa fa-info-circle ' +
                                                    styles.icon
                                                }
                                            ></i>
                                        </DefaultTooltip>
                                    </div>
                                    <tr
                                        style={{
                                            display: 'block',
                                            marginLeft: '5px',
                                            marginBottom: '5px',
                                        }}
                                    >
                                        <CreatableSelect
                                            isMulti
                                            //data={this.state.tumorEntityItems}
                                            defaultValue={
                                                this.tumorEntityDefault
                                            }
                                            name="entitySearch"
                                            className="basic-multi-select"
                                            classNamePrefix="select"
                                            placeholder="Select Tumor Entities..."
                                            onChange={(
                                                selectedOption: string[]
                                            ) => {
                                                const newEntities = [];
                                                if (selectedOption !== null) {
                                                    const entities = selectedOption;
                                                    newEntities.push(
                                                        ...entities
                                                    );
                                                }
                                                this.setState({
                                                    tumorEntityItems: newEntities,
                                                });

                                                console.group(
                                                    'TRIALS Entities Changed'
                                                );
                                                console.log(
                                                    this.state.tumorEntityItems
                                                );
                                                console.groupEnd();
                                            }}
                                        ></CreatableSelect>
                                    </tr>
                                </td>
                            </tr>
                            <td>
                                <div className={styles.tooltipSpan}>
                                    <span className={styles.header5}>
                                        Recruiting Status:
                                    </span>
                                    <DefaultTooltip
                                        overlay={STATUS_TOOLTIP}
                                        trigger={['hover', 'focus']}
                                        destroyTooltipOnHide={true}
                                    >
                                        <i
                                            className={
                                                'fa fa-info-circle ' +
                                                styles.icon
                                            }
                                        ></i>
                                    </DefaultTooltip>
                                </div>
                                <tr
                                    style={{
                                        display: 'block',
                                        marginLeft: '5px',
                                        marginBottom: '5px',
                                    }}
                                >
                                    <ClinicalTrialMatchRecruitingSelect
                                        data={this.state.recruitingItems}
                                        options={this.recruiting_values.map(
                                            recStatus => ({
                                                label: recStatus,
                                                value: recStatus,
                                            })
                                        )}
                                        isMulti
                                        name="recruitingStatusSearch"
                                        className="basic-multi-select"
                                        classNamePrefix="select"
                                        placeholder="Select status..."
                                        onChange={(
                                            selectedOption: Array<any>
                                        ) => {
                                            const newStatuses = [];
                                            if (selectedOption !== null) {
                                                const statuses = selectedOption;
                                                newStatuses.push(...statuses);
                                            }
                                            this.setState({
                                                recruitingItems: newStatuses,
                                            });
                                        }}
                                    />
                                </tr>
                            </td>
                            <td>
                                <div className={styles.tooltipSpan}>
                                    <span className={styles.header5}>
                                        Countries:
                                    </span>
                                    <DefaultTooltip
                                        overlay={COUNTRIES_TOOLTIP}
                                        trigger={['hover', 'focus']}
                                        destroyTooltipOnHide={true}
                                    >
                                        <i
                                            className={
                                                'fa fa-info-circle ' +
                                                styles.icon
                                            }
                                        ></i>
                                    </DefaultTooltip>
                                </div>
                                <tr
                                    style={{
                                        display: 'block',
                                        marginLeft: '5px',
                                        marginBottom: '5px',
                                    }}
                                >
                                    <Select
                                        data={this.state.countryItems}
                                        options={this.countries.map(cnt => ({
                                            label: cnt,
                                            value: cnt,
                                        }))}
                                        isMulti
                                        name="CountrySearch"
                                        className="basic-multi-select"
                                        classNamePrefix="select"
                                        placeholder="Select countries..."
                                        onChange={(
                                            selectedOption: Array<any>
                                        ) => {
                                            const newStatuses = [];
                                            if (selectedOption !== null) {
                                                const statuses = selectedOption.map(
                                                    item => item.value
                                                );
                                                newStatuses.push(...statuses);
                                            }
                                            this.setState({
                                                countryItems: newStatuses,
                                            });
                                        }}
                                    />
                                </tr>
                            </td>
                            <tr>
                                <div className={styles.tooltipSpan}>
                                    <span className={styles.header5}>
                                        Patient Age:
                                    </span>
                                    <DefaultTooltip
                                        overlay={AGE_TOOLTIP}
                                        trigger={['hover', 'focus']}
                                        destroyTooltipOnHide={true}
                                    >
                                        <i
                                            className={
                                                'fa fa-info-circle ' +
                                                styles.icon
                                            }
                                        ></i>
                                    </DefaultTooltip>
                                </div>
                                <div
                                    style={{
                                        display: 'block',
                                        marginLeft: '5px',
                                        marginBottom: '5px',
                                    }}
                                >
                                    <CreatableSelect
                                        isClearable
                                        isMulti={false}
                                        components={customComponents}
                                        placeholder="Select age..."
                                        onChange={(newValue: any) => {
                                            console.log(newValue);
                                            console.log(typeof newValue);
                                            if (
                                                newValue !== null &&
                                                this.state.ageState !== null
                                            ) {
                                                this.setState({
                                                    ageState: +parseInt(
                                                        newValue.value
                                                    ),
                                                });
                                            } else {
                                                this.setState({
                                                    ageState: 0,
                                                });
                                            }
                                        }}
                                        defaultValue={{
                                            value: this.state.ageState,
                                            label: this.state.ageState,
                                        }}
                                    />
                                </div>
                                <td>
                                    <div className={styles.tooltipSpan}>
                                        <span className={styles.header5}>
                                            Patient Sex:
                                        </span>
                                        <DefaultTooltip
                                            overlay={SEX_TOOLTIP}
                                            trigger={['hover', 'focus']}
                                            destroyTooltipOnHide={true}
                                        >
                                            <i
                                                className={
                                                    'fa fa-info-circle ' +
                                                    styles.icon
                                                }
                                            ></i>
                                        </DefaultTooltip>
                                    </div>
                                    <tr
                                        style={{
                                            display: 'block',
                                            marginLeft: '5px',
                                            marginBottom: '5px',
                                        }}
                                    >
                                        <Select
                                            options={this.genders.map(
                                                gender => ({
                                                    label: gender,
                                                    value: gender,
                                                })
                                            )}
                                            name="genderSearch"
                                            defaultValue={this.gender}
                                            className="basic-select"
                                            classNamePrefix="select"
                                            placeholder="Select gender..."
                                            onChange={(selectedOption: any) => {
                                                var newStatuses = '';
                                                if (selectedOption !== null) {
                                                    newStatuses =
                                                        selectedOption.value;
                                                }
                                                this.setState({
                                                    gender: newStatuses,
                                                });
                                            }}
                                        />
                                    </tr>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className={styles.tooltipSpan}>
                                        <span className={styles.header5}>
                                            Patient Location:
                                        </span>
                                        <DefaultTooltip
                                            overlay={LOCATION_TOOLTIP}
                                            trigger={['hover', 'focus']}
                                            destroyTooltipOnHide={true}
                                        >
                                            <i
                                                className={
                                                    'fa fa-info-circle ' +
                                                    styles.icon
                                                }
                                            ></i>
                                        </DefaultTooltip>
                                    </div>
                                    <tr
                                        style={{
                                            display: 'block',
                                            marginLeft: '5px',
                                            marginBottom: '5px',
                                        }}
                                    >
                                        <Select
                                            options={this.locationsWithCoordinates.map(
                                                city => ({
                                                    label: city,
                                                    value: city,
                                                })
                                            )}
                                            name="locationDistance"
                                            className="basic-select"
                                            classNamePrefix="select"
                                            placeholder="Select patient location..."
                                            onChange={(selectedOption: any) => {
                                                var newStatuses = '';
                                                if (selectedOption !== null) {
                                                    newStatuses =
                                                        selectedOption.value;
                                                }
                                                this.setState({
                                                    patientLocation: newStatuses,
                                                });
                                            }}
                                        />
                                    </tr>
                                </td>

                                <div className={styles.tooltipSpan}>
                                    <span className={styles.header5}>
                                        Max Distance:
                                    </span>
                                    <DefaultTooltip
                                        overlay={MAX_DISTANCE_TOOLTIP}
                                        trigger={['hover', 'focus']}
                                        destroyTooltipOnHide={true}
                                    >
                                        <i
                                            className={
                                                'fa fa-info-circle ' +
                                                styles.icon
                                            }
                                        ></i>
                                    </DefaultTooltip>
                                </div>
                                <div
                                    style={{
                                        display: 'block',
                                        marginLeft: '5px',
                                        marginBottom: '5px',
                                    }}
                                >
                                    <div className="config">
                                        <label>
                                            <input
                                                className="input"
                                                type="checkbox"
                                                checked={this.state.isOpened}
                                                onChange={({
                                                    target: { checked },
                                                }) =>
                                                    this.setState({
                                                        isOpened: checked,
                                                    })
                                                }
                                            />{' '}
                                            Set maximum distance in km
                                        </label>
                                        <Collapse
                                            isOpened={this.state.isOpened}
                                        >
                                            <input
                                                placeholder="Distance in km"
                                                value={this.state.maxDistance}
                                                onChange={event =>
                                                    this.setState({
                                                        maxDistance: event.target.value.replace(
                                                            /\D/,
                                                            ''
                                                        ),
                                                    })
                                                }
                                            />
                                        </Collapse>
                                    </div>
                                </div>
                            </tr>
                        </div>
                        <div style={{ paddingTop: '20px' }}>
                            <button
                                onClick={this.setSearchParams.bind(this)}
                                className={'btn btn-default'}
                                style={{
                                    display: 'block',
                                    marginLeft: '5px',
                                }}
                            >
                                Search
                            </button>
                        </div>
                    </React.Fragment>
                </Modal.Body>
            </Modal>
        );
    }
}

export default ClinicalTrialMatchTableOptions;
