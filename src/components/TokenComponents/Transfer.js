import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import ListBatchesWithCheckbox from './SplitMergeComponents/ListBatchesWithCheckbox';
import * as tokenOperations from '../../tokenOperations';
import CircularProgress from '@material-ui/core/CircularProgress';
import TransferForm from './TransferComponents/TransferForm';
import Snackbar from '@material-ui/core/Snackbar';

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
    margin: theme.spacing.unit,
  },
  containerItem: {
    flexBasis: '45%',
    margin : theme.spacing.unit * 3,
  },
  root: theme.mixins.gutters({
    paddingTop: 16,
    paddingBottom: 16,
    marginRight: 32,
    marginTop: theme.spacing.unit * 3,
  }),
  inputContainer: {
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
	},
	Qrcode: {
		paddingLeft: '30%',
	},
	button: {
		marginLeft: '35%',
		marginTop: '3%',
	},
});

class ComposedTextField extends React.Component {
	constructor (props) {
		super(props);

		this.state = {
			tokenAddress: props.tokenAddress,
			batchList: [],
			selectedBatchList: [],
			selectedBatchAmount: [],
			batchAmount: [],
      isTokenAmountLoaded: false,
      status: 'Loading...',
      snackbarOpen : false,
      snackbarText : ""
		};

		this.getTokens();
	}

	// Get list of tokens for each source contract
  getTokens = () => {
    var tokenIns = tokenOperations.getTokenInstance(this.state.tokenAddress);

    // Generate list of token id's under each ingredients token
    tokenIns.getPastEvents('Transfer', {
      fromBlock: 0,
      toBlock: 'latest'
    }).then((events) => {
			var tokenList = tokenOperations.getTokens(events);

      this.setState({
				batchList: tokenList
			});

      this.getTokenAmount();
    });
	};

	// Get amount for each batch in the product
  getTokenAmount = () => {
    var tokenIns = tokenOperations.getTokenInstance(this.state.tokenAddress);
    var batchList = this.state.batchList;
    var tokenLength = this.state.batchAmount.length;

    if (tokenLength !== batchList.length) {
      tokenIns.methods.cut(batchList[tokenLength]).call()
        .then((result) => {
					tokenIns.methods.getAvailableAmount(result[1]).call()
          .then((amt) => {
            var arr = this.state.batchAmount;
            arr[tokenLength] = parseInt(amt, 0);

            this.setState({
              batchAmount: arr
            });

            this.getTokenAmount();
          });
        });
    } else {
      this.setState({
				isTokenAmountLoaded: true
			});
    }
	}

  // gets called everytime a batch is selected by user
  batchSelected = (batchList) => {
    var selectedBatchList = [];
    var selectedBatchAmount = [];

    for (var i = 0; i < batchList.length; i++) {
      selectedBatchList.push(this.state.batchList[batchList[i]-1]);
      selectedBatchAmount.push(this.state.batchAmount[batchList[i]-1]);
    }

    this.setState({
      selectedBatchList: selectedBatchList,
      selectedBatchAmount: selectedBatchAmount
    });
	}

  // Transfer batches to another user
  transferBatch = (receiverAddr) => {
    var selectedBatchList = [];

    if (receiverAddr === '') {
      console.log('Empty address');
      return;
    }

    for (var i = 0; i < this.state.selectedBatchList.length; i++) {
      var tokenId = '0x' + this.state.selectedBatchList[i].slice(-24);
      selectedBatchList.push(tokenId);
    }

    this.setState({
      batchList: [],
      selectedBatchList: [],
      selectedBatchAmount: [],
      batchAmount: [],
      isTokenAmountLoaded: false,
      status: 'Transferring Batch(es)...'
    });

    tokenOperations.transferBatches(selectedBatchList, receiverAddr)
    .then((result) => {
      this.getTokens();

      this.setState({
        snackbarText : 'Batch transferred',
        snackbarOpen : true
      });
    });
	};

   // Close snackbar
   handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    this.setState({ snackbarOpen: false });
  };

  render() {
    const { classes } = this.props;

    return (
      this.state.isTokenAmountLoaded ?
      <div className={classes.container}>
        <div className={classes.containerItem}>
          <ListBatchesWithCheckbox
            batchList={this.state.batchList}
            batchAmount={this.state.batchAmount}
            tokenDesc={this.props.tokenDesc}
            batchSelected= {this.batchSelected}>
          </ListBatchesWithCheckbox>
        </div>
        <div className={classes.containerItem}>
          <TransferForm
						selectedBatchList={this.state.selectedBatchList}
            transferBatch={this.transferBatch}>
          </TransferForm>
        </div>
        <Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          open={this.state.snackbarOpen}
          autoHideDuration={6000}
          onClose={this.handleClose}
          ContentProps={{
            'aria-describedby': 'message-id',
          }}
          message={<span id="message-id">{this.state.snackbarText}</span>}
        />
      </div>
      :
      <div className="loading">
        <CircularProgress size={100}/>
        <div className="loadingText">{this.state.status}</div>
      </div>
    );
  }
}

ComposedTextField.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(ComposedTextField);