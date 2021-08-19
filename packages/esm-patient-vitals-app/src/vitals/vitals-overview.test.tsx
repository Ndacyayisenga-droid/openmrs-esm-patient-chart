import React from 'react';
import { cache } from 'swr';
import { screen } from '@testing-library/react';
import { attach, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { mockPatient } from '../../../../__mocks__/patient.mock';
import { mockFhirVitalsResponse, mockVitalsConfig } from '../../../../__mocks__/vitals.mock';
import { render, waitForLoadingToFinish } from '../../../../tools/app-test-utils';
import VitalsOverview from './vitals-overview.component';

const testProps = {
  patientUuid: mockPatient.id,
  showAddVitals: false,
};

const mockAttach = attach as jest.Mock;
const mockOpenmrsFetch = openmrsFetch as jest.Mock;
const mockUseConfig = useConfig as jest.Mock;
mockUseConfig.mockImplementation(() => mockVitalsConfig);
mockOpenmrsFetch.mockImplementation(jest.fn());

function renderVitalsOverview() {
  render(<VitalsOverview {...testProps} />);
}

describe('VitalsOverview: ', () => {
  it('renders an empty state view if vitals data is unavailable', async () => {
    cache.clear();
    mockOpenmrsFetch.mockReturnValueOnce({ data: [] });
    renderVitalsOverview();

    await waitForLoadingToFinish();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /vitals/i })).toBeInTheDocument();
    expect(screen.getByText(/There are no vital signs to display for this patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Record vital signs/i)).toBeInTheDocument();
  });

  it('renders an error state view if there is a problem fetching allergies data', async () => {
    const error = {
      message: 'You are not logged in',
      response: {
        status: 401,
        statusText: 'Unauthorized',
      },
    };

    cache.clear();
    mockOpenmrsFetch.mockRejectedValueOnce(error);
    renderVitalsOverview();

    await waitForLoadingToFinish();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /vitals/i })).toBeInTheDocument();
    expect(screen.getByText(/Error 401: Unauthorized/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sorry, there was a problem displaying this information. You can try to reload this page, or contact the site administrator and quote the error code above/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders an overview of the patient's vital signs", async () => {
    cache.clear();
    mockOpenmrsFetch.mockReturnValueOnce({ data: mockFhirVitalsResponse });
    renderVitalsOverview();

    await waitForLoadingToFinish();
    expect(screen.getByRole('heading', { name: /vitals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chart view/i })).toBeInTheDocument();

    const expectedColumnHeaders = [/date/, /bp/, /r. rate/, /pulse/, /spO2/, /temp/];

    expectedColumnHeaders.map((header) =>
      expect(screen.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeInTheDocument(),
    );

    const expectedTableRows = [
      /19 - May - 2021 121 \/ 89 12 76 37/,
      /10 - May - 2021 120 \/ 90 45 66 90 37/,
      /07 - May - 2021 120 \/ 80/,
    ];

    expectedTableRows.map((row) => expect(screen.getByRole('row', { name: new RegExp(row, 'i') })).toBeInTheDocument());
  });
});
